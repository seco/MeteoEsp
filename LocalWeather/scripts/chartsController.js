
Date.prototype.addHours = function(h) {
    this.setTime(this.getTime() + (h * 60 * 60 * 1000));
    return this;
};

var chartsController = function(params) {

    var interval = "1 HOUR";
    var queryType = "chart";
    var modules = [];
    var activeModuleMac = "";
    var utcDateTimes = [];

    function getQueryParams() {
        return {
            interval: interval,
            queryType: queryType
        };
    }

    function requestModulesData() {
        queryHelper.requestModuleData({}, renderModulesData);
    }

    function renderModulesData(moduleData) {
        modules = moduleData.data;

        if (modules.length > 0)
            activeModuleMac = modules[0].MAC;

        renderModules();
        requestSensorsData(true);
    }

    function getModuleDescription(mac) {
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            if (module.MAC == mac) {
                return "{0} (#{1})".format(module.ModuleName, module.ModuleID);
            }
        }

        return "Не найдено";
    }

    function updateActiveModuleName(moduleSpan) {
        moduleSpan.innerHTML = "Модуль {0}".format(getModuleDescription(activeModuleMac));
    }

    function renderModuleController() {
        var moduleController = ge("moduleController");
        var moduleSpan = document.createElement("span");
        moduleSpan.id = "moduleSpan";
        moduleController.appendChild(moduleSpan);

        moduleSpan.id = "moduleSpan";
        moduleSpan.className = "example";
        moduleSpan.setAttribute("data-jq-dropdown", "#jq-dropdown-1");

        updateActiveModuleName(moduleSpan);
    }

    function renderModules() {
        var container = ge("modulesMenu");
        var moduleSpan = ge("moduleSpan");

        updateActiveModuleName(moduleSpan);

        for (var i = 0; i < modules.length; i++) {
            var li = document.createElement("li");
            container.appendChild(li);
            li.innerHTML = "<a class='moduleItem'>{0}</a>".format(modules[i].ModuleName);
            li.setAttribute("mac", modules[i].MAC);
            li.onclick = function() {
                var mac = this.getAttribute("mac");
                if (activeModuleMac != mac)
                {
                    activeModuleMac = mac;
                    updateActiveModuleName(moduleSpan);
                    requestChartData();
                }
            };
        }
    }

    function requestChartData() {
        queryHelper.requestWeatherData(getQueryParams(), renderChartData);
    }

    function prepareData(data, column) {
        var columnData = [];

        for (var i = 0; i < data.length; i++) {
            var dt = utcDateTimes[i];
            var value = data[i][column];
            columnData.push([dt, value]);
        }

        return columnData;
    }

    function prepareUtcDateTimes(data, dateColumn) {
        utcDateTimes = [];

        var now = new Date();
        var currentTimeZoneOffsetInHours = now.getTimezoneOffset() / 60;

        for (var i = 0; i < data.length; i++) {
            var dt = data[i][dateColumn];
            var localdt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), dt.getHours(), dt.getMinutes(), dt.getSeconds());
            localdt = localdt.addHours(-currentTimeZoneOffsetInHours);
            var utcdt = Date.UTC(localdt.getUTCFullYear(), localdt.getUTCMonth(), localdt.getUTCDate(), localdt.getUTCHours(), localdt.getUTCMinutes(), localdt.getUTCSeconds());
            utcDateTimes.push(utcdt);
        }
    }

    function renderChartData(weatherData) {
        var data = weatherData.data;
        for (var i = 0; i < data.length; i++) {
            data[i].MeasuredDateTime = new Date(data[i].MeasuredDateTime);
        }

        prepareUtcDateTimes(data, "MeasuredDateTime");
        var t1 = prepareData(data, "Temperature1");
        var t2 = prepareData(data, "Temperature2");
        var t3 = prepareData(data, "Temperature3");
        var h1 = prepareData(data, "Humidity1");
        var h3 = prepareData(data, "Humidity3");
        var p2 = prepareData(data, "Pressure2");
        var lx = prepareData(data, "Illumination");

        $('#chart').highcharts({
            chart: {
                borderColor: '#484c5a',
                backgroundColor: '#3D3F48',
                borderWidth: 1,
                type: 'line'
            },
            title: {
                text: 'Данные измерений',
                style: { color: "#c0c4c8" }
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: 1,
                gridLineColor: '#484c5a',
                tickColor: "#484c5a"
            },
            yAxis: [{
                title: {
                    text: 'Температура (°C)',
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a'
            }, {
                title: {
                    text: 'Относительная влажность (%)',
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a'
            }, {
                title: {
                    text: 'Атмосферное давление (mmHg)',
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a'
            }, {
                title: {
                    text: 'Освещенность (lx)',
                    style: { color: "#c0c4c8" }
                },
                gridLineWidth: 1,
                gridLineColor: '#484c5a'
            }],
            tooltip: {
                valueSuffix: ' °C'
            },
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                borderWidth: 0
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
                name: 'T1',
                data: t1
            }, {
                yAxis: 0,
                name: 'T2',
                data: t2
            }, {
                yAxis: 0,
                name: 'T3',
                data: t3
            }, {
                yAxis: 1,
                name: 'RH1',
                data: h1
            }, {
                yAxis: 1,
                name: 'RH3',
                data: h3
            }, {
                yAxis: 2,
                name: 'P2',
                data: p2
            }, {
                yAxis: 3,
                name: 'Lx',
                data: lx
            }]
        });
    }

    function getIntervalDescription(interval) {
        var intervalAnchors = $(".intervalItem");
        for (var i = 0; i < intervalAnchors.length; i++) {
            var a = intervalAnchors[i];
            if (a.getAttribute("interval") == interval)
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
            var intervalToSet = this.getAttribute("interval");
            if (intervalToSet != interval) {
                interval = intervalToSet;
                intervalSpan.innerHTML = "Показывать график за {0}".format(getIntervalDescription(interval));
                requestChartData();
            }
        });
    }

    function requestSensorsData(initialRequest) {
        queryHelper.requestSensorData({}, function(sensorsData) {
            renderSensorsData(sensorsData, initialRequest);
        });
    }

    function renderSensorsData(sensorsData, initialRequest) {
        var sensors = sensorsData.data;
        var sensorsList = ge("sensorsList");
        sensorsList.innerHTML = "";
        for (var i = 0; i < sensors.length; i++) {
            renderSensor(sensorsList, sensors[i]);
        }

        if (initialRequest)
            requestChartData();
    }

    function sensorDataUpdated(payload) {
        if (payload.result === true) {
            requestSensorsData(false);
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
        label.innerHTML = sensor.SensorName;
        label.htmlFor = cb.id;
        cbParent.appendChild(label);
    }

    function init() {
        renderModuleController();
        renderChartController();
        requestModulesData();
    }

    init();
};
