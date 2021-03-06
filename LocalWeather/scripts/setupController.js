
var setupController = function(params) {

    var SENSORS_DELAY = 10000;

    var modules = [];
    var fields = [];

    var headerMap = [];
    headerMap['ID'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ModuleID'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ModuleName'] = {name: "Модуль", title: "", align: "", width: "", visibility: false};
    headerMap['MAC'] = {name: "", title: "", align: "", width: "", visibility: true};
    headerMap['IP'] = {name: "", title: "", align: "", width: "", visibility: true};
    headerMap['Description'] = {name: "Описание", title: "Нажмите для правки", align: "", width: "", visibility: true};
    headerMap['SensorDelay'] = {name: "Период опроса, сек", title: "", align: "", width: "", visibility: true};
    headerMap['LastSeenDateTime'] = {name: "Обновлено", title: "", align: "", width: "", visibility: true};
    headerMap['IsActive'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ChartVisibility'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['TableVisibility'] = {name: "", title: "", align: "", width: "", visibility: false};

    function requestModulesData() {
        queryHelper.requestModuleData({ sortBy: "ModuleName" }, renderModulesData);
    }

    function getModuleByMAC(mac) {
        for (var i = 0; i < modules.length; i++) {
            if (modules[i].MAC == mac)
                return modules[i];
        }

        return null;
    }

    function renderModulesData(moduleData) {

        fields = moduleData.fields;
        modules = moduleData.data;

        if (modules.length > 0) {
            ge("jumboMessage").style.display = "none";
        }

        for (var i = 0; i < modules.length; i++) {
            modules[i].LastSeenDateTime = new Date(modules[i].LastSeenDateTime);
        }

        var container = ge("pageContainer");
        var row = document.createElement("div");
        row.className = "row";
        container.appendChild(row);

        for (i = 0; i < modules.length; i++) {
            renderModule(row, modules[i]);
        }

        console.log("Time until everything loaded: ", Date.now()-timerStart);

        window.setInterval(onTimer, SENSORS_DELAY);
    }

    function getModuleStatus(module) {
        var isActive = module.IsActive !== 0;
        var lastSeenDateTime = module.LastSeenDateTime;
        var diff = Math.abs(new Date() - lastSeenDateTime);
        var delay = module.SensorDelay * 1000; //in ms
        var isOn = diff < delay * 2;
        var status = isActive ? (isOn ? "В сети" : "Не в сети") : "Выключен";
        var className = isActive ? (isOn ? "success" : "danger") : "warning";
        var buttonClass = isOn ? "btn" : "btn disabled";

        var headerId = "{0}_header".format(module.MAC);
        var widgetId = "{0}_widget".format(module.MAC);
        var btnStatusId = "{0}_btnStatus".format(module.MAC);
        var btnSetupId = "{0}_btnSetup".format(module.MAC);
        var btnEditId = "{0}_btnEdit".format(module.MAC);

        return {
            name: module.ModuleName,
            moduleId: module.ModuleID,
            status: status,
            className: className,
            isOn: isOn,
            headerId: headerId,
            buttonClass: buttonClass,
            btnStatusId: btnStatusId,
            btnSetupId: btnSetupId,
            btnEditId: btnEditId,
            widgetId: widgetId
        };
    }

    function getModuleTitle(status) {
        return "{0} (#{1})&nbsp;&nbsp;<span class='label label-{3}'>{2}</span>".format(status.name, status.moduleId, status.status, status.className);
    }

    function getModuleLink(module) {
        return "http://{0}".format(module.IP);
    }

    function renderModule(row, module) {

        var status = getModuleStatus(module);

        var col = document.createElement("div");
        col.id = status.widgetId;
        col.className = "col-sm-6 col-md-4 moduleWidget";
        if (!status.isOn) {
            col.classList.add("inactiveModuleWidget");
        }
        row.appendChild(col);

        var thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        col.appendChild(thumbnail);

        var caption = document.createElement("div");
        caption.className = "caption";
        thumbnail.appendChild(caption);

        var header = document.createElement("h3");
        header.id = status.headerId;
        header.innerHTML = getModuleTitle(status);
        caption.appendChild(header);

        var hr = document.createElement("hr");
        caption.appendChild(hr);

        renderModuleFields(caption, module);

        hr = document.createElement("hr");
        caption.appendChild(hr);

        var p = document.createElement("p");
        p.innerHTML = "<a title='Правка параметров отображения модуля' data-mac='" + module.MAC + "' data-toggle='modal' data-target='#editModuleModal' id='" + status.btnEditId + "' class='btn btn-info' role='button'>Параметры модуля</a>";
        caption.appendChild(p);

        hr = document.createElement("hr");
        caption.appendChild(hr);

        p = document.createElement("p");
        var href = getModuleLink(module);

        p.innerHTML = "<a title='Состояние устройства' href='" + href + "' target='_blank' id='" + status.btnStatusId + "' class='" + status.buttonClass + " btn-default' role='button'>Состояние</a> " +
                      "<a title='Настройка устройства' href='" + href + "/setup' target='_blank' id='" + status.btnSetupId + "' class='" + status.buttonClass + " btn-primary' role='button'>Настройка</a>";
        caption.appendChild(p);

        var btnEditId = ge(status.btnEditId);
        btnEditId.onclick = function() {
            var title = ge("moduleModalTitle");
            title.innerHTML = "Параметры {0} (#{1})".format(status.name, status.moduleId);

            var mac = this.getAttribute("data-mac");
            var m = getModuleByMAC(mac);
            if (m) {
                ge("inputDescription").value = m.Description;
                ge("inputActive").checked = m.IsActive != 0;
                ge("inputMAC").value = mac;
            }
        };
    }

    function getHeaderByName(name) {
        return headerMap[name];
    }

    function getModuleParam(module, param) {
        var text = module[param];
        if (isStringEmpty(text))
            return "&ndash;";
        return text;
    }

    function getParamValue(fieldName, value) {
        if (fieldName == "LastSeenDateTime")
            return DateFormat.format.date(value, "HH:mm:ss dd/MM/yyyy");

        return value;
    }

    function getModuleParamMap(header, field, module) {
        var paramName = (!header || isStringEmpty(header.name)) ? field.name : header.name;
        var paramValue = getParamValue(field.name, getModuleParam(module, field.name));
        var paramId = "{0}_{1}".format(module.MAC, field.name);

        return {name: paramName, value: paramValue, id: paramId};
    }

    function formatPrettyDate(module) {
        var lastSeenDateTime = module.LastSeenDateTime;
        return DateFormat.format.prettyDate(lastSeenDateTime);
    }

    function renderModuleFields(container, module) {

        var fieldsContainer = document.createElement("div");
        fieldsContainer.className = "fieldsContainer";
        container.appendChild(fieldsContainer);

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            var header = getHeaderByName(field.name);
            if (header && !header.visibility)
                continue;

            var row = document.createElement("h4");
            var paramMap = getModuleParamMap(header, field, module);

            var paramName = paramMap.name;
            var paramValue = paramMap.value;
            var paramId = paramMap.id;
            var paramTitle = header.title;

            if (field.name == "LastSeenDateTime") {
                paramTitle = paramValue;
                paramValue = formatPrettyDate(module);
            }

            row.innerHTML = "{0}: <span class='label label-default floatRight' id='{2}' title='{3}'>{1}</span>".format(paramName, paramValue, paramId, paramTitle);
            fieldsContainer.appendChild(row);
        }
    }

    function onTimer() {
        queryHelper.requestModuleData({}, updateModulesData);
    }

    function updateModulesData(moduleData) {

        fields = moduleData.fields;
        modules = moduleData.data;

        for (var i = 0; i < modules.length; i++) {
            modules[i].LastSeenDateTime = new Date(modules[i].LastSeenDateTime);
        }

        for (i = 0; i < modules.length; i++) {
            updateModule(modules[i]);
        }
    }

    function updateModule(module) {

        var status = getModuleStatus(module);
        var btnStatus = ge(status.btnStatusId);
        var btnSetup = ge(status.btnSetupId);
        var col = ge(status.widgetId);

        if (status.isOn) {
            col.classList.remove("inactiveModuleWidget");

            var href = getModuleLink(module);
            btnStatus.href = href;
            btnSetup.href = href + "/setup";
        } else {
            col.classList.add("inactiveModuleWidget");
        }

        var header = ge(status.headerId);
        header.innerHTML = getModuleTitle(status);

        btnStatus.className = status.buttonClass + " btn-default";
        btnSetup.className = status.buttonClass + " btn-primary";

        updateModuleFields(module);
    }

    function updateModuleFields(module) {

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];

            var header = getHeaderByName(field.name);
            if (header && !header.visibility)
                continue;

            var paramMap = getModuleParamMap(header, field, module);
            var label = ge(paramMap.id);

            var paramValue = paramMap.value;
            var paramTitle = header.title;

            if (field.name == "LastSeenDateTime") {
                paramTitle = paramValue;
                paramValue = formatPrettyDate(module);
            }

            label.innerHTML = paramValue;
            label.title = paramTitle;
        }
    }

    function setupEventHandlers() {
        var btnSaveModule = ge("btnSaveModule");
        btnSaveModule.onclick = function() {
            var description = ge("inputDescription").value;
            var mac = ge("inputMAC").value;
            var isActive = ge("inputActive").checked;

            queryHelper.updateModuleData({
                mac: mac,
                description: description,
                isActive: isActive
            }, moduleDataUpdated);
        };
    }

    function moduleDataUpdated(moduleData) {
        updateModulesData(moduleData);
    }

    function init() {
        requestModulesData();
        setupEventHandlers();
    }

    init();
};
