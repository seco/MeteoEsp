
var datasController = function(params) {

    var sortBy = "ID";
    var sortAscending = false;
    var pageSize = 20;
    var pageIndex = 0;
    var queryType = "all";

    var headerMap = [];
    headerMap['ID'] = {name: "#", title: "", align: "", width: "50px", visibility: true};
    headerMap['ModuleID'] = {name: "", title: "", align: "", width: "", visibility: false};
    headerMap['ModuleName'] = {name: "Модуль", title: "", align: "", width: "150px", visibility: true};
    headerMap['Temperature1'] = {name: "T1, °C", title: "", align: "", width: "70px", visibility: true};
    headerMap['Temperature2'] = {name: "T2, °C", title: "", align: "", width: "70px", visibility: true};
    headerMap['Temperature3'] = {name: "T3, °C", title: "", align: "", width: "70px", visibility: true};
    headerMap['Humidity1'] = {name: "RH 1, %", title: "", align: "", width: "70px", visibility: true};
    headerMap['Humidity2'] = {name: "RH 2, %", title: "", align: "", width: "70px", visibility: true};
    headerMap['Humidity3'] = {name: "RH 3, %", title: "", align: "", width: "70px", visibility: true};
    headerMap['Pressure1'] = {name: "P 1, mmHg", title: "", align: "", width: "90px", visibility: true};
    headerMap['Pressure2'] = {name: "P 2, mmHg", title: "", align: "", width: "90px", visibility: true};
    headerMap['Pressure3'] = {name: "P 3, mmHg", title: "", align: "", width: "90px", visibility: true};
    headerMap['Illumination'] = {name: "Lx", title: "Освещенность", align: "", width: "50px", visibility: true};
    headerMap['MeasuredDateTime'] = {name: "Измерено", title: "Дата и время измерения", align: "", width: "150px", visibility: true};

    function getQueryParams() {
        return {
            sortBy: sortBy,
            sortAscending: sortAscending,
            pageSize: pageSize,
            pageIndex: pageIndex,
            queryType: queryType
        };
    }

    function requestWeatherTable() {
        queryHelper.requestWeatherData(getQueryParams(), renderWeatherTable);
    }

    function renderWeatherTable(weatherData) {
        var fields = weatherData.fields;
        var data = weatherData.data;
        for (var i = 0; i < data.length; i++) {
            data[i].MeasuredDateTime = new Date(data[i].MeasuredDateTime);
        }
        pageIndex = weatherData.pageIndex;

        var resultsGrid = ge("results");
        resultsGrid.innerHTML = "";

        var gridPlaceholder = document.createElement('table');
        resultsGrid.appendChild(gridPlaceholder);

        var head = document.createElement('thead');
        gridPlaceholder.appendChild(head);

        var fieldName;
        var headerInfo;

        for (var i = 0; i < fields.length; i++) {
            fieldName = fields[i].name;
            headerInfo = headerMap[fieldName];

            if (headerInfo.visibility) {
                var th = document.createElement("th");
                th.innerHTML = isStringEmpty(headerInfo.name) ? fieldName : headerInfo.name;
                head.appendChild(th);

                if (!isStringEmpty(headerInfo.width)) {
                    th.style.minWidth = headerInfo.width;
                }

                if (!isStringEmpty(headerInfo.title)) {
                    th.title = headerInfo.title;
                }

                renderSorter(th, fieldName);
            }
        }

        for (i = 0; i < data.length; i++) {
            var weatherItem = data[i];

            var tr = document.createElement("tr");
            gridPlaceholder.appendChild(tr);

            for (var j = 0; j < fields.length; j++) {
                fieldName = fields[j].name;
                headerInfo = headerMap[fieldName];

                if (headerInfo.visibility) {
                    var td = document.createElement("td");
                    renderDataCell(td, fieldName, weatherItem);
                    tr.appendChild(td);

                    if (!isStringEmpty(headerInfo.align)) {
                        td.style.textAlign = headerInfo.align;
                    }
                }
            }
        }

        renderPager(weatherData);

        console.log("Time until everything loaded: ", Date.now()-timerStart);
    }

    function renderDataCell(td, fieldName, data) {
        var text = data[fieldName];

        if (fieldName == "ModuleName") {
            td.innerHTML = "{0} (#{1})".format(data[fieldName], data["ModuleID"]);
            return;
        }
        if (fieldName == "MeasuredDateTime") {
            td.innerHTML = DateFormat.format.date(data[fieldName], "HH:mm:ss dd/MM/yyyy");
            return;
        }

        td.innerHTML = text;
    }

    function renderSorter(th, fieldName) {
        if (sortBy == fieldName) {
            th.innerHTML += sortAscending ? "&#8595;" : "&#8593;";
            th.className = "sortedColumn";
        }

        th.setAttribute("sortBy", fieldName);
        th.onclick = function() {
            var sortByToDisplay = this.getAttribute("sortBy");
            if (sortBy == sortByToDisplay) { //change sort order
                sortAscending = !sortAscending;
            } else { //apply new sort column
                sortBy = sortByToDisplay;
                sortAscending = true;
                pageIndex = 0;
            }
            requestWeatherTable();
        };
    }

    function isPageDivVisible(pagesCount, pageIndexToRender) {
        if (pageIndexToRender == 0 || pageIndexToRender == pagesCount - 1) { //first and last
            return true;
        }
        return Math.abs(pageIndexToRender - pageIndex) < 3;
    }

    function renderPagerDescription(pagerContainer, pagesCount) {
        var pagerDescription = document.createElement("div");
        pagerDescription.className = "pagerDescription";
        pagerDescription.innerHTML = "Страница {0} из {1}".format(pageIndex + 1, pagesCount);
        pagerContainer.appendChild(pagerDescription);
    }

    function renderGaps(pagerContainer, renderedPages) {
        var previousPage = 0;
        for (var i = 0; i < renderedPages.length; i++) {
            var index = parseInt(renderedPages[i].getAttribute("pageIndex"));
            if (index - previousPage > 1) {
                var pagerGap = document.createElement("div");
                pagerGap.className = "pagerDescription";
                pagerGap.innerHTML = "&ndash;";
                pagerContainer.insertBefore(pagerGap, renderedPages[i]);
            }
            previousPage = index;
        }
    }

    function renderPageSizeChooser(pagerContainer) {
        var pagerGap = document.createElement("div");
        pagerGap.className = "pagerDescription";
        pagerContainer.appendChild(pagerGap);

        var pagerSpan = document.createElement("span");
        pagerGap.appendChild(pagerSpan);

        pagerSpan.className = "example";
        pagerSpan.innerHTML = "Записей на странице: {0}".format(pageSize);
        pagerSpan.setAttribute("data-jq-dropdown", "#jq-dropdown-1");

        var pageSizeAnchors = $(".pageSizeItem");
        pageSizeAnchors.bind("click", function() {
            var pageSizeToSet = parseInt(this.innerHTML);
            if (pageSizeToSet != pageSize) {
                pageSize = pageSizeToSet;
                requestWeatherTable();
            }
        });
    }

    function renderPager(weatherData) {

        var pagesCount = Math.ceil(weatherData.rowsCount / weatherData.pageSize);
        var pagerContainer = ge("pager");
        pagerContainer.innerHTML = "";
        var renderedPages = [];

        renderPagerDescription(pagerContainer, pagesCount);

        for (var i = 0; i < pagesCount; i++) {
            if (isPageDivVisible(pagesCount, i)) {
                var pageDiv = document.createElement("div");
                pageDiv.className = "pager";
                if (i == pageIndex) {
                    pageDiv.className += " selectedPage";
                }
                pageDiv.innerHTML = (i + 1).toString();
                pageDiv.setAttribute("pageIndex", i);
                pageDiv.onclick = function () {
                    pageIndex = parseInt(this.getAttribute("pageIndex"));
                    requestWeatherTable();
                };
                pagerContainer.appendChild(pageDiv);

                renderedPages.push(pageDiv);
            }
        }

        renderGaps(pagerContainer, renderedPages);
        renderPageSizeChooser(pagerContainer);
    }

    function init() {
        requestWeatherTable();
    }

    init();
};
