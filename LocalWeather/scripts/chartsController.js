
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
};

var chartsController = function(params) {

    var interval = "1 HOUR";
    var queryType = "chart";

    var modules = [];
    var filteredMacs = "";

    var utcDateTimes = [];

    var sensors = [];
    var weatherData = [];

    function getQueryParams() {
        return {
            interval: interval,
            queryType: queryType,
            filteredMacs: filteredMacs
        };
    }

    function requestModulesData() {
        queryHelper.requestModuleData({ sortBy: "ModuleName" }, renderModulesData);
    }

    function getFilteredMacs() {
        var macs = [];
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];

            var cb = ge("cb_{0}".format(module.MAC));
            if (cb.checked) {
                macs.push(module.MAC);
            }
        }

        return macs.join(",");
    }

    function renderModulesData(moduleData) {
        modules = moduleData.data;

        renderModules();
        filteredMacs = getFilteredMacs();

        requestSensorsData();
    }

    function getModuleDescription(mac) {
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            if (module.MAC == mac) {
                return "Модуль: {0}".format(isStringEmpty(module.Description) ? getModuleTitle(module) : module.Description);
            }
        }

        return "Нет модулей для отображения";
    }

    function updateActiveModuleName(moduleSpan) {
        moduleSpan.innerHTML = getModuleDescription(activeModuleMac);
        if (modules.length == 0) {
            moduleSpan.classList.add("jq-dropdown-disabled");
        } else {
            moduleSpan.classList.remove("jq-dropdown-disabled");
        }
    }

    function getModuleTitle(module) {
        return "{0} (#{1})".format(module.ModuleName, module.ModuleID);
    }

    function renderModules() {
        var modulesList = ge("modulesList");
        modulesList.innerHTML = "";

        for (var i = 0; i < modules.length; i++) {
            // render dropdown item
            renderModule(modulesList, modules[i]);
        }
    }

    function renderModule(modulesList, module) {

        var cbParent = document.createElement("div");
        cbParent.className = "checkbox checkbox-warning";
        modulesList.appendChild(cbParent);

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "styled";
        cb.checked = module.ChartVisibility == 1;
        cb.setAttribute("data-mac", module.MAC);
        cb.id = "cb_{0}".format(module.MAC);
        cb.onclick = function() {
            var mac = this.getAttribute("data-mac");
            queryHelper.updateModuleData({
                mac: mac,
                chartVisibility: this.checked ? 1 : 0
            }, moduleDataUpdated);
        };
        cbParent.appendChild(cb);

        var label = document.createElement("label");
        var title = getModuleTitle(module);
        label.innerHTML = isStringEmpty(module.Description) ? title : module.Description;
        label.htmlFor = cb.id;
        cbParent.appendChild(label);
    }

    function moduleDataUpdated(moduleData) {
        modules = moduleData.data;
        filteredMacs = getFilteredMacs();
        requestWeatherData();
    }

    function requestWeatherData() {
        queryHelper.requestWeatherData(getQueryParams(), renderWeatherData);
    }

    function prepareData(columnName) {
        var columnData = [];

        for (var i = 0; i < weatherData.length; i++) {
            var dt = utcDateTimes[i];
            var value = weatherData[i][columnName];
            if (value != null)
                columnData.push([dt, value]);
        }

        return columnData;
    }

    function calculateKalman(values) {
        var result = [];

        // defaults are: R = 1, Q = 1, A = 1, B = 0, C = 1
        var k = new kalman(0.01, 20, 1, 0, 1);

        for (var i = 0; i < values.length; i++) {
            var value = values[i];
            var filteredValue = k.filter(value, 0);
            result.push(filteredValue);
        }

        return result;
    }

    function prepareKalmanData(columnData) {
        var dateTimes = [];
        var values = [];

        var i, dt, value;

        for (i = 0; i < columnData.length; i++) {
            var data = columnData[i];
            dt = data[0];
            value = data[1];

            dateTimes.push(dt);
            values.push(value);
        }

        var kalmanData = [];

        var filteredValues = calculateKalman(values);

        for (i = 0; i < columnData.length; i++) {
            dt = dateTimes[i];
            value = filteredValues[i];

            kalmanData.push([dt, value]);
        }

        return kalmanData;
    }

    function prepareUtcDateTimes(dateColumnName) {
        utcDateTimes = [];

        var now = new Date();
        var currentTimeZoneOffsetInHours = now.getTimezoneOffset() / 60;

        for (var i = 0; i < weatherData.length; i++) {
            var dt = weatherData[i][dateColumnName];
            var localdt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
            localdt = localdt.addHours(-currentTimeZoneOffsetInHours);
            var utcDatetime = Date.UTC(localdt.getUTCFullYear(), localdt.getUTCMonth(), localdt.getUTCDate(), localdt.getUTCHours(), localdt.getUTCMinutes(), localdt.getUTCSeconds());
            utcDateTimes.push(utcDatetime);
        }
    }

    function mbToMmHg(pressure) {
        if (pressure === null)
            return null;

        return pressure * 0.750064;
    }

    function renderWeatherData(payload) {
        weatherData = payload.data;
        for (var i = 0; i < weatherData.length; i++) {
            weatherData[i].MeasuredDateTime = isIE ? Date.parse(data[i].MeasuredDateTime.replace(" ", "T")) : new Date(weatherData[i].MeasuredDateTime);
            weatherData[i].Pressure1 = mbToMmHg(weatherData[i].Pressure1);
            weatherData[i].Pressure2 = mbToMmHg(weatherData[i].Pressure2);
            weatherData[i].Pressure3 = mbToMmHg(weatherData[i].Pressure3);
            weatherData[i].Pressure4 = mbToMmHg(weatherData[i].Pressure4);
        }

        prepareUtcDateTimes("MeasuredDateTime");

        renderWeatherCharts();
    }

    function getIntervalDescription(interval) {
        var intervalAnchors = $(".intervalItem");
        for (var i = 0; i < intervalAnchors.length; i++) {
            var a = intervalAnchors[i];
            if (a.getAttribute("data-interval") == interval)
                return a.innerHTML;
        }

        return "";
    }

    function renderChartController() {
        var chartController = ge("chartController");
        var intervalSpan = document.createElement("span");
        chartController.appendChild(intervalSpan);

        intervalSpan.id = "intervalSpan";
        intervalSpan.className = "example";
        intervalSpan.innerHTML = "Показывать график за {0}".format(getIntervalDescription(interval));
        intervalSpan.setAttribute("data-jq-dropdown", "#jq-dropdown-2");

        var intervalAnchors = $(".intervalItem");
        intervalAnchors.bind("click", function() {
            var intervalToSet = this.getAttribute("data-interval");
            if (intervalToSet != interval) {
                interval = intervalToSet;
                intervalSpan.innerHTML = "Показывать график за {0}".format(getIntervalDescription(interval));
                requestWeatherData();
            }
        });
    }

    function requestSensorsData() {
        queryHelper.requestSensorData({}, renderSensorsData);
    }

    function renderWeatherCharts() {
        for (var i = 0; i < sensors.length; i++) {
            renderSensorChart(sensors[i]);
        }

        console.log("Time until everything loaded: ", Date.now()-timerStart);
    }

    function initHighchartsObject(sensor) {
        var chartData = prepareData(sensor.SensorName);
        var kalmanData = prepareKalmanData(chartData);
        var chartContainer = ge("chartContainer_{0}".format(sensor.SensorName));

        var chartTitle = isStringEmpty(sensor.Description) ? sensor.SensorName : sensor.Description;
        var sensorChart = $(chartContainer).highcharts({
            chart: {
                backgroundColor: '#3D3F48',
                type: 'line'
            },
            title: {
                text: chartTitle,
                style: { color: "#c0c4c8" }
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                gridLineColor: '#484c5a',
                tickColor: "#484c5a",
                labels: {
                    style: { color: "#c0c4c8" }
                }
            },
            yAxis: [{
                title: {
                    text: sensor.ChartTitle,
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a',
                labels: {
                    style: { color: "#c0c4c8" }
                }
            }],
            lang: {
                noData: "Нет данных для отображения"
            },
            noData: {
                style: {
                    fontWeight: 'normal',
                    fontSize: '15px',
                    color: '#c0c4c8'
                }
            },
            tooltip: {
                valueSuffix: " " + sensor.Units,
                formatter: function () {
                    var name = "<b>Величина:</b> " + this.series.name;
                    var dt = "<b>Измерено:</b> " + DateFormat.format.date(this.x, "HH:mm:ss dd/MM/yyyy");
                    var value = "<b>Значение:</b> " + this.y.toFixed(2) + " " + sensor.Units;
                    return name + "<br/>" + dt + "<br/>" + value;
                }
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                series: {
                    marker: {
                        radius: 0
                    }
                }
            },
            series: [{
                yAxis: 0,
                data: kalmanData,
                color: "#F6A821",
                name: chartTitle
            }]
        });
    }

    function renderSensorChart(sensor) {
        var widget = ge("sensorWidget_{0}".format(sensor.SensorName));
        var showChart = sensor.ChartVisibility === 1;
        widget.style.display = showChart ? "" : "none";

        if (showChart) {
            initHighchartsObject(sensor);
        }
    }

    function renderSensorChartContainer(chartsContainer, sensor) {
        var col = document.createElement("div");
        col.className = "col-sm-6 col-md-4 sensorWidget";
        col.id = "sensorWidget_{0}".format(sensor.SensorName);
        col.style.display = "none";
        chartsContainer.appendChild(col);

        var thumbnail = document.createElement("div");
        thumbnail.className = "thumbnail";
        col.appendChild(thumbnail);

        var caption = document.createElement("div");
        caption.className = "caption";
        thumbnail.appendChild(caption);

        var chartContainer = document.createElement("div");
        chartContainer.className = "chartContainer";
        chartContainer.id = "chartContainer_{0}".format(sensor.SensorName);
        caption.appendChild(chartContainer);
    }

    function renderSensorsData(sensorsData) {
        // save received data
        sensors = sensorsData.data;

        var sensorsList = ge("sensorsList");
        sensorsList.innerHTML = "";
        var chartsContainer = ge("chartsContainer");
        chartsContainer.innerHTML = "";

        for (var i = 0; i < sensors.length; i++) {
            // render dropdown item
            renderSensor(sensorsList, sensors[i]);
            // render chart thumb
            renderSensorChartContainer(chartsContainer, sensors[i]);
        }

        requestWeatherData();
    }

    function sensorDataUpdated(sensorsData) {

        var oldSensorsState = [];
        for (var i = 0; i < sensors.length; i++) {
            oldSensorsState.push(sensors[i]);
        }

        sensors = sensorsData.data;

        for (i = 0; i < sensors.length; i++) {
            var sensor = sensors[i];
            if (sensor.ChartVisibility != oldSensorsState[i].ChartVisibility)
                renderSensorChart(sensor);
        }
    }

    function renderSensor(sensorsList, sensor) {

        var cbParent = document.createElement("div");
        cbParent.className = "checkbox checkbox-warning";
        sensorsList.appendChild(cbParent);

        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "styled";
        cb.checked = sensor.ChartVisibility == 1;
        cb.setAttribute("sensorid", sensor.ID);
        cb.id = "cb_{0}".format(sensor.ID);
        cb.onclick = function() {
            var sensorId = parseInt(this.getAttribute("sensorid"));
            queryHelper.updateSensorData({
                id: sensorId,
                chartVisibility: this.checked ? 1 : 0
            }, sensorDataUpdated);
        };
        cbParent.appendChild(cb);

        var label = document.createElement("label");
        label.innerHTML = sensor.Description;
        label.htmlFor = cb.id;
        cbParent.appendChild(label);
    }

    function init() {
        renderChartController();
        requestModulesData();
    }

    init();
};
