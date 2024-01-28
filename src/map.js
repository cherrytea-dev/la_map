
var userData = window.userData

var userHomeCoordinates;
var userRadius;
var userRegionIdsList;
var currentUserLocation = null;
var startingPoint = null;

var userTheme = 'light'
if (window.colorScheme) {userTheme = window.colorScheme}  // for telegram
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {userTheme = 'dark'}  // web

var userSearchesList;

if (userData) {
    if (userData.params.home_lat && userData.params.home_lon) {
        userHomeCoordinates = [userData.params.home_lat, userData.params.home_lon]
    }
    console.log('WE VE GOT THE HOME COORDS', userHomeCoordinates)
    userRadius = userData.params.radius
    console.log('WE VE GOT THE RADIUS', userRadius)
    userRegionIdsList = userData.params.regions
    console.log('WE VE GOT THE REGIONS', userRegionIdsList)
    userSearchesList = userData.params.searches
    console.log('WE VE GOT THE SEARCHES', userSearchesList)
}

// TODO – avoiding cases with several coordinates. To be redesigned in the future
userSearchesList.forEach(search => {
    search.coords = search.coords[0]
})
// TODO ^^^


const DEFAULT_CENTER_COORDINATES = [55.75254, 37.623082] // Center of Moscow
const BOUNDARIES_SHRINK_COEFFICIENT = 0.2  // percentage of default userActiveArea to be NOT shown at first screen
// above relates only to the regions boundaries & radius area, NOT affecting searches
const BOUNDARIES_EXPAND_COEFFICIENT = 0 // ADDITIONAL percentage of default userActiveArea to be shown at
// first screen. Relates only to searches, NOT affecting regions boundaries & radius area

var countryBoundaryNorth = 70;
var countryBoundarySouth = 41;
var countryBoundaryWest = 20;
var countryBoundaryEast = 180;

var restrictedMapArea = [[82.23618,-90], [-73.87011,181]];

const MARKER_COLOR_INACTIVE = '#FF6600'
const MARKER_COLOR_ACTIVE = '#ff3300'

const BALLOON_RELATIVE_WIDTH = 0.75

const DARK_MAP = 'custom#dark';
var actualCenterCoordinates = userHomeCoordinates || DEFAULT_CENTER_COORDINATES;
var actualBasicMapParameters = {
    center: actualCenterCoordinates,
    zoom: 9,
    controls: []
    // details : https://yandex.com/dev/jsapi-v2-1/doc/ru/v2-1/dg/concepts/controls/standard#layer-change
    // geolocationControl – текущее положение,
    // typeSelector – слои
    // routeButtonControl – навигация
    // trafficControl – пробки
    // fullscreenControl – переход в полноэкранный режим
    // zoomControl – кнопки масштаба
    // rulerControl – линейка
    // ??? – конпка перейти в яндекс
    // ??? – окошко поиска
};

var fogColor = 'rgb(255, 255, 255)';
var forBorderColor = 'rgb(255, 255, 255)';
if (userTheme === 'dark') {
    actualBasicMapParameters.type = DARK_MAP;
    fogColor = 'rgb(0, 0, 0)';
    forBorderColor = 'rgb(0, 0, 0)';
}

var userCircle = null;
var turfCircle = null;
var unitedUserRegionsMultiPolygon = null;
var listOfRegionObjects = [];
var userActiveArea = null;
var boundaries = {"show": false};
var geodesicCirclePoints = null;
var BalloonContentLayout;
var allRoutes = [];
var markers = {};
var balloonMaxWidth;
var polygonForTurf;

function addDarkTheme() {
    if (userTheme === 'dark') {
        ymaps.layer.storage.add(DARK_MAP, function DarkLayer() {
            return new ymaps.Layer(
                'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&theme=dark&%c&%l&scale={{ scale }}'
            );
        });

        ymaps.mapType.storage.add(DARK_MAP, new ymaps.MapType('Dark Map', [DARK_MAP]));
    }
}

function initMap() {

    map = new ymaps.Map("map",
        actualBasicMapParameters, {
        restrictMapArea: restrictedMapArea, // restrict unnecessary areas of map
        suppressMapOpenBlock: true // deactivate a button in the left bottom corner "open in yandex"
            // MEMO - it's deactivated because the button somehow does not work on android
    })

    let mapElement = document.getElementById('map');
    balloonMaxWidth = Math.round(mapElement.offsetWidth * BALLOON_RELATIVE_WIDTH);
}

function addControls() {
    //controls: ['geolocationControl', 'routeButtonControl', 'trafficControl', 'zoomControl']

    var geolocationControl = new ymaps.control.GeolocationControl({
        options: {
            layout: 'round#buttonLayout'
        }
    });

    geolocationControl.events.add('locationchange', function (event) {
        var position = event.get('position');
        currentUserLocation = position; // Update the global variable with the new location
        console.log("User's location updated: Latitude =", position[0], "Longitude =", position[1]);
    });

    var trafficControl = new ymaps.control.TrafficControl(
        {state: {trafficShown: false},
            options: {
                size: 'small',
                float: 'left'
            }});

    var infoControl = new ymaps.control.Button({
        data: {
            //iconType: 'loupe',
            title: 'О карте',
            content: 'О карте'
        },
        options: {
            layout: 'round#buttonLayout',
            maxWidth: 120,
            float: 'left'
        }
    });

    infoControl.events.add('click', function () {
        createInfoPanel();
        // Use setTimeout to delay the state reset
        setTimeout(function() {
            infoControl.state.set('selected', false);
        }, 10); // 10 milliseconds delay
    });

    map.controls.add(geolocationControl);
    map.controls.add(trafficControl);
    map.controls.add(infoControl);

    var zoomControl = new ymaps.control.ZoomControl({
        options: {
            layout: 'round#zoomLayout'
        }
    });

    map.controls.add(zoomControl);

    // FIXME - trying to catch what "open in yandex" does
    // Select the element using its class name
    const ymapsLink = document.querySelector('.ymaps-2-1-79-gotoymaps');

    // Check if the element exists
    if (ymapsLink) {
        // Add an event listener for the 'click' event
        ymapsLink.addEventListener('click', (event) => {
            console.log('Yandex Maps link clicked!');

            // Prevent the default action to inspect the event
            event.preventDefault();

            // Log the event object to the console
            console.log(event);
        });
    } else {
        console.log('Yandex Maps link not found');
    }
    // FIXME ^^^




    // MEMO – below is as per https://yandex.ru/dev/maps/jsbox/2.1/list_box_layout
    // Создадим собственный макет выпадающего списка.
    ListBoxLayout = ymaps.templateLayoutFactory.createClass(
        "<button id='my-listbox-header' class='btn btn-success dropdown-toggle' data-toggle='dropdown'>" +
        "{{data.title}} <span class='caret'></span>" +
        "</button>" +
        // Этот элемент будет служить контейнером для элементов списка.
        // В зависимости от того, свернут или развернут список, этот контейнер будет
        // скрываться или показываться вместе с дочерними элементами.
        "<ul id='my-listbox'" +
        " class='dropdown-menu' role='menu' aria-labelledby='dropdownMenu'" +
        " style='display: {% if state.expanded %}block{% else %}none{% endif %};'></ul>", {

            build: function() {
                // Вызываем метод build родительского класса перед выполнением
                // дополнительных действий.
                ListBoxLayout.superclass.build.call(this);

                this.childContainerElement = $('#my-listbox').get(0);
                // Генерируем специальное событие, оповещающее элемент управления
                // о смене контейнера дочерних элементов.
                this.events.fire('childcontainerchange', {
                    newChildContainerElement: this.childContainerElement,
                    oldChildContainerElement: null
                });
            },

            // Переопределяем интерфейсный метод, возвращающий ссылку на
            // контейнер дочерних элементов.
            getChildContainerElement: function () {
                return this.childContainerElement;
            },

            clear: function () {
                // Заставим элемент управления перед очисткой макета
                // откреплять дочерние элементы от родительского.
                // Это защитит нас от неожиданных ошибок,
                // связанных с уничтожением dom-элементов в ранних версиях ie.
                this.events.fire('childcontainerchange', {
                    newChildContainerElement: null,
                    oldChildContainerElement: this.childContainerElement
                });
                this.childContainerElement = null;
                // Вызываем метод clear родительского класса после выполнения
                // дополнительных действий.
                ListBoxLayout.superclass.clear.call(this);
            }
        }),

        // Также создадим макет для отдельного элемента списка.
        ListBoxItemLayout = ymaps.templateLayoutFactory.createClass(
            "<li><a>{{data.content}}</a></li>"
        ),

        // Создадим 2 пункта выпадающего списка
        listBoxItems = [
            new ymaps.control.ListBoxItem({
                data: {
                    content: 'Москва',
                    center: [55.751574, 37.573856],
                    zoom: 9
                }
            }),
            new ymaps.control.ListBoxItem({
                data: {
                    content: 'Омск',
                    center: [54.990215, 73.365535],
                    zoom: 9
                }
            })
        ],

        // Теперь создадим список, содержащий 2 пункта.
        listBox = new ymaps.control.ListBox({
            items: listBoxItems,
            data: {
                title: 'Выберите пункт'
            },
            options: {
                // С помощью опций можно задать как макет непосредственно для списка,
                layout: ListBoxLayout,
                // так и макет для дочерних элементов списка. Для задания опций дочерних
                // элементов через родительский элемент необходимо добавлять префикс
                // 'item' к названиям опций.
                itemLayout: ListBoxItemLayout
            }
        });

    listBox.events.add('click', function (e) {
        // Получаем ссылку на объект, по которому кликнули.
        // События элементов списка пропагируются
        // и их можно слушать на родительском элементе.
        var item = e.get('target');
        // Клик на заголовке выпадающего списка обрабатывать не надо.
        if (item != listBox) {
            map.setCenter(
                item.data.get('center'),
                item.data.get('zoom')
            );
        }
    });

    //map.controls.add(listBox, {float: 'left'});

    /*var typeSelector = new ymaps.control.TypeSelector({
        options: {
            layout: 'round#listBoxLayout',
            itemLayout: 'round#listBoxItemLayout',
            itemSelectableLayout: 'round#listBoxItemSelectableLayout',
            float: 'left'
        }
    });
    map.controls.add(typeSelector);*/

}

function addDropDownListOfSearchTypes() {

    /*var typeSelector = new ymaps.control.TypeSelector({
        options: {
            layout: 'round#listBoxLayout',
            itemLayout: 'round#listBoxItemLayout',
            itemSelectableLayout: 'round#listBoxItemSelectableLayout',
            float: 'left'
        }*/

    var listItems = [
            new ymaps.control.ListBoxItem('Только активные'),
            new ymaps.control.ListBoxItem('Все новые за 10 дней'),
            new ymaps.control.ListBoxItem('Все актуальные за 60 дней')
        ],

        myListBox = new ymaps.control.ListBox({
            data: {
                content: 'Выбрать отображаемые поиски'
                
            },
            items: listItems,
            options: {
                //layout: 'round#buttonLayout',
                //itemLayout: 'round#listBoxItemLayout',
                //itemSelectableLayout: 'round#listBoxItemSelectableLayout',
                float: 'left'
                //position: {
                //    bottom: '40px',
                //    left: '10px'
                //}
            }
        });

    map.controls.add(myListBox);

}

function addCurvedCircle() {
    // we do not draw the circle for radius > 2000 km
    if (userRadius && userHomeCoordinates && userRadius <= 2000) {
        userCircle = new ymaps.Circle(
            [userHomeCoordinates, userRadius*1000],
            {},
            {
                draggable: false,
                fill: false,
                cursor: "grab",
                strokeColor: forBorderColor,
                strokeOpacity: 0.8,
                strokeWidth: 3,
                geodesic: true
            });
        map.geoObjects.add(userCircle);
    }
}

function defineGeodesicCirclePoints() {

    if (userHomeCoordinates && userRadius) {

        let startPoint = userHomeCoordinates;
        let numIterations = 72; // Number of points of circle
        let degreeStep = 360 / numIterations;
        var radius = userRadius*1000; // in meters

        let points = [];

        for (var i = 0; i <= numIterations; i++) {
            var azimuth = (Math.PI / 180) * (degreeStep * i);
            var direction = [Math.cos(azimuth), Math.sin(azimuth)];
            var destination = ymaps.coordSystem.geo.solveDirectProblem(startPoint, direction, radius).endPoint;
            if (destination[1] > countryBoundaryEast) {
                destination[1] = countryBoundaryEast
            }
            if (destination[1] < countryBoundaryWest) {
                destination[1] = countryBoundaryWest
            }
            if (destination[0] > countryBoundaryNorth) {
                destination[0] = countryBoundaryNorth
            }
            if (destination[0] < countryBoundarySouth) {
                destination[0] = countryBoundarySouth
            }
            points.push(destination);
        }

        // check if the first and the last points are the same. if they don't – add the first one in the end again
        if (points[0][0] !== points[points.length - 1][0] || points[0][1] !== points[points.length - 1][1]) {
            points.push(points[0]);
        }
        geodesicCirclePoints = points
    }
}

function drawGeodesicCircle() {
    if (geodesicCirclePoints) {
        var polygon = new ymaps.Polygon([geodesicCirclePoints]);
        map.geoObjects.add(polygon);
    }
}

function findRecordById(csvText, id) {
    const rows = csvText.split('\n');
    const headers = rows[0].split(';');
    const idIndex = headers.indexOf('id');

    for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split(';');
        if (cells[idIndex] == id) {
            return cells.reduce((obj, cell, index) => {
                obj[headers[index]] = cell;
                return obj;
            }, {});
        }
    }
    return null;
}

function convertCoordsStringToArray(coordsString) {
    // Remove extra quotes and escapes
    const formattedString = coordsString.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"');

    // Parse the string into an array
    try {
        var coordsArray = JSON.parse(formattedString);
        return coordsArray;
    } catch (e) {
        console.error('Error parsing coordinates:', e);
        return null;
    }
}

async function defineRegionsMultiPolygon() {

    const csvPath = 'regions_from_yandex.csv';
    let regionRecordInCSV = null;
    await fetch(csvPath)
        .then(response => response.text())
        .then(csvText => {
            let firstRegion = true;
            userRegionIdsList.forEach(regionId => {
                regionRecordInCSV = findRecordById(csvText, regionId);
                const regionCoordinatesListInCSV = convertCoordsStringToArray(regionRecordInCSV.coords);
                listOfRegionObjects.push(turf.polygon(regionCoordinatesListInCSV))

                if (firstRegion === true) {
                    unitedUserRegionsMultiPolygon = turf.polygon(regionCoordinatesListInCSV)
                } else {
                    unitedUserRegionsMultiPolygon = turf.union(unitedUserRegionsMultiPolygon, turf.polygon(regionCoordinatesListInCSV))
                }
                firstRegion = false

                // deactivated as we're not showing it to user
                /*regionCoordinatesListInCSV.forEach(singlePolygon => {

                  const polygonFeature = new ymaps.GeoObject({
                    geometry: {
                      type: "Polygon",
                      coordinates: [singlePolygon]
                    }
                  }, {
                      fillColor: "#66ff99",
                    }
                  )
                  //map.geoObjects.add(polygonFeature);
                })*/
            })

        })
        .catch(error => {
            console.error('Error fetching CSV:', error);
        });
}


function createPolygonForTurf() {

    console.log('userActiveArea', userActiveArea)

    if (userActiveArea.geometry.type === "MultiPolygon") {
        polygonForTurf = userActiveArea.geometry.coordinates[0][0]
    } else {
        polygonForTurf = userActiveArea.geometry.coordinates[0]
    }
    console.log('polygonForTurf 0', polygonForTurf)

    if (polygonForTurf[0][0] !== polygonForTurf[polygonForTurf.length - 1][0] ||
        polygonForTurf[0][1] !== polygonForTurf[polygonForTurf.length - 1][1]) {
        polygonForTurf.push(polygonForTurf[0]);
        console.log('polygonForTurf 1', polygonForTurf)
    }
}


async function defineUserActiveArea() {

    if (geodesicCirclePoints) {
        turfCircle = turf.polygon([geodesicCirclePoints]);
        console.log("turfCircle", turfCircle)
    }

    if (turfCircle && unitedUserRegionsMultiPolygon) {
        userActiveArea = turf.intersect(turfCircle, unitedUserRegionsMultiPolygon);
        createPolygonForTurf()
        userActiveArea = turf.polygon([polygonForTurf]); // focus only on the first polygon
    } else if (turfCircle || unitedUserRegionsMultiPolygon) {
        userActiveArea = turfCircle || unitedUserRegionsMultiPolygon;
        createPolygonForTurf()
        userActiveArea = turf.polygon([polygonForTurf]);
        console.log('userActiveArea', userActiveArea)
    }
}

function addFogOnMap() {

    let cutOutArea = null;
    if (userActiveArea) {
        cutOutArea = userActiveArea.geometry.coordinates[0]
    }

    const polygonFeature = new ymaps.GeoObject({
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [85, -100],
                        [85, 0],
                        [85, 100],
                        [85, 180],
                        [85, -110],
                        [-85, -110],
                        [-85, 180],
                        [-85, 100],
                        [-85, 0],
                        [-85, -100],
                        [85, -100]

                    ],
                    cutOutArea,  // cutting away a circle & regions
                ],

            },
        }, {
            fillColor: fogColor,
            fillOpacity: 0.5,
            strokeWidth: 3,
            strokeColor: forBorderColor,
            strokeOpacity: 0.8,
            cursor: "drag"
            //coordRendering: "straightPath",
            //draggable: true,
            //contentEditable: true
        }
    )
    map.geoObjects.add(polygonFeature);


    //userActiveAreaPolygons =
    /*const polygonFeature = new map_feature({
      id: 'fog',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-181, 90],
            [179, 90],
            [179, -90],
            [-181, -90],
            [-181, 90]
          ],
          userActiveArea.geometry.coordinates[0],  // cutting away a circle & regions
        ]
      },
      style: {
        stroke: [{width: 3, color: forBorderColor}],
        fill: fogColor,
      }
    });

    map.addChild(polygonFeature);*/
}

function addHome() {

    if (userHomeCoordinates) {
        map.geoObjects.add(new ymaps.Placemark(userHomeCoordinates, {
            balloonContent: 'Домашние координаты. Внимание, это не ваша текущая позиция, ' +
                'а фиксированная точка, которую вы задали в Боте как "Домашние координаты"'
        }, {
            preset: 'islands#governmentCircleIcon',
            iconColor: 'lightgrey'
        }))

    }
}

function findBounds() {

    let lon_min = null;
    let lon_max = null;
    let lat_min = null;
    let lat_max = null;
    let all_markers = [];
    let all_area_points =[];

    if (userHomeCoordinates) {all_markers.push(userHomeCoordinates)}

    if (Object.keys(userSearchesList).length !== 0) {
        userSearchesList.forEach(
            marker => {
                all_markers.push(marker.coords)
            }
        )}

    if (userActiveArea !== null && Object.keys(userActiveArea.geometry.coordinates[0]).length !== 0) {
        userActiveArea.geometry.coordinates[0].forEach(point => {
            all_area_points.push(point);
        })
    }

    // calculate points for regions & circle
    if (Object.keys(all_area_points).length !== 0) {
        all_area_points.forEach(point => {
            if (Object.keys(point).length !== 0) {
                if (lon_min === null) {
                    lon_min = point[1];
                    lon_max = point[1];
                    lat_min = point[0];
                    lat_max = point[0];
                } else {
                    lon_min = Math.min(lon_min, point[1]);
                    lon_max = Math.max(lon_max, point[1]);
                    lat_min = Math.min(lat_min, point[0]);
                    lat_max = Math.max(lat_max, point[0]);
                    boundaries.show = true
                }
            }
        });
    }
    const area_lon_min = lon_min + (lon_max - lon_min)*BOUNDARIES_SHRINK_COEFFICIENT
    const area_lon_max = lon_max - (lon_max - lon_min)*BOUNDARIES_SHRINK_COEFFICIENT
    const area_lat_min = lat_min + (lat_max - lat_min)*BOUNDARIES_SHRINK_COEFFICIENT
    const area_lat_max = lat_max - (lat_max - lat_min)*BOUNDARIES_SHRINK_COEFFICIENT

    // calculate points for markers
    lon_min = null;
    lon_max = null;
    lat_min = null;
    lat_max = null;
    if (Object.keys(all_markers).length !== 0) {
        all_markers.forEach(point => {
            if (Object.keys(point).length !== 0) {
                if (lon_min === null) {
                    lon_min = point[1];
                    lon_max = point[1];
                    lat_min = point[0];
                    lat_max = point[0];
                } else {
                    lon_min = Math.min(lon_min, point[1]);
                    lon_max = Math.max(lon_max, point[1]);
                    lat_min = Math.min(lat_min, point[0]);
                    lat_max = Math.max(lat_max, point[0]);
                    boundaries.show = true
                }
            }
        });
    }
    const markers_lon_min = lon_min - (lon_max - lon_min)*BOUNDARIES_EXPAND_COEFFICIENT
    const markers_lon_max = lon_max + (lon_max - lon_min)*BOUNDARIES_EXPAND_COEFFICIENT
    const markers_lat_min = lat_min - (lat_max - lat_min)*BOUNDARIES_EXPAND_COEFFICIENT
    const markers_lat_max = lat_max + (lat_max - lat_min)*BOUNDARIES_EXPAND_COEFFICIENT

    lon_min = area_lon_min // Math.min(area_lon_min, markers_lon_min)
    lon_max = area_lon_max // Math.max(area_lon_max, markers_lon_max)
    lat_min = area_lat_min // Math.min(area_lat_min, markers_lat_min)
    lat_max = area_lat_max // Math.max(area_lat_max, markers_lat_max)

    boundaries.bounds = [[lat_min, lon_min], [lat_max, lon_max]]
    console.log('bounds', boundaries.bounds)

}

function setBounds() {
    if (boundaries.show === true) {
        map.setBounds(boundaries.bounds, {duration: 600});
    }
}

function sortMarkers() {
    //sort the list of coords
    let alpha = 15;
    let radians = alpha * (Math.PI / 180);
    let cosValue = Math.cos(radians);
    let sinValue = Math.sin(radians);

    userSearchesList.sort((a, b) => {
        // Assigning priorities based on conditions
        const getPriority = (element) => {
            if (element.search_is_old !== true && element.exact_coords === true) return 3;
            if (element.search_is_old !== true && element.exact_coords !== true) return 2;
            return 1; // For search_is_old === true
        };

        const a_priority = getPriority(a);
        const b_priority = getPriority(b);

        // First, sort by priority
        if (a_priority !== b_priority) {
            return a_priority - b_priority;
        }

        // If priorities are equal, sort by the existing method
        const a_coords = a.coords;
        const b_coords = b.coords;
        const a_new = a_coords[1] * cosValue - a_coords[0] * sinValue;
        const b_new = b_coords[1] * cosValue - b_coords[0] * sinValue;
        return b_new - a_new;
    });
}

function composePopupContent (search) {

    let resultingContent = '<div class="popup">' +
        '<span class="popup__text"><span class="popup__subtext">БВП:</span> ';


    if (search.display_name) {
        resultingContent += '<b>' + search.display_name + '</b><br>'
    } else {
        resultingContent += '<b>неизвестный</b><br>'
    }

    resultingContent += '<span class="popup__subtext">Тип поиска:</span> ';
    if (search.search_type) {
        resultingContent += search.search_type + '<br>'
    } else {
        resultingContent += 'не определено<br>'
    }

    resultingContent += '<span class="popup__subtext">Ищем:</span> ';
    if (search.freshness) {
        resultingContent += search.freshness + '<br>'
    } else {
        resultingContent += 'неизвестно<br>'
    }

    resultingContent += '<span class="popup__subtext">Статус поиска:</span> '
    if (search.search_status) {
        resultingContent += search.search_status + '<br>'
    } else {
        resultingContent += 'не определён<br>'
    }

    resultingContent += '<span class="popup__subtext">Координаты:</span> '
    if (search.exact_coords) {
        resultingContent += 'Точные<br>'
    } else {
        resultingContent += 'ТРЕБУЮТ УТОЧНЕНИЯ<br>'
    }

    let unknownTimeElement = '<button id="button_duration_calculate" class="button_forum">Определить</button>'

    resultingContent += '<span class="popup__subtext">Время в пути: </span>' +
        '<span id="route-duration" style="display: none;"></span>' +
        '<span id="route-duration-default" style="display: inline;">' + unknownTimeElement + '</span>' + '<br>';

    // TODO – to be deleted as outdated
    /*resultingContent += '<div id="search_description" style="display: none;">';
    resultingContent += '<br><span class="popup__subtext">Описание поиска:</span><br>'
    if (search.content) {
        resultingContent += search.content + '<br>'
    } else {
        resultingContent += 'Описание поиска: не определено<br>'
    }
    resultingContent += '</div>';*/

    resultingContent += '</span><span id="route-duration" style="display: none;"></span><br />' + // Initially hidden
        '<button id="button_show_description" class="button_forum">Показать описание поиска</button><br>' +
        '<button id="button_forum" class="button_forum">Перейти на форум</button><br>' +
        '<button id="button_route" class="button_forum">Построить маршрут</button>' +
        '</div>'

    console.log({resultingContent})
    return resultingContent
}

// Function to replace the button and bind the Yandex link
function replaceButtonAndBindYandexLink(record) {
    // Replace the 'Построить маршрут' button with 'ПЕРЕЙТИ В ЯНДЕКС'
    $('#button_route').replaceWith('<button id="button_go_to_yandex" class="button_forum">ПЕРЕЙТИ В ЯНДЕКС</button>');

    // Bind the new button to open a dynamically generated Yandex Maps link
    $('#button_go_to_yandex').bind('click', function() {

        var yandexMapsURL = 'https://yandex.ru/maps/?rtext='
            + startingPoint.join(',')
            + '~'
            + record.coords.join(',')
            + '&rtn=0&rtt=auto&rtm=atm&origin=jsapi_2_1_79&from=api-maps';

        window.open(yandexMapsURL, '_blank');
    });
}

function declareBalloonClass(record) {

    let composedContent = composePopupContent(record)

    BalloonContentLayout = ymaps.templateLayoutFactory.createClass(composedContent, {

        build: function () {
            BalloonContentLayout.superclass.build.call(this);

            $('#button_forum').bind('click', function() {
                if (record && record.link) {
                    window.open(record.link, '_blank');
                } else {
                    console.error('Invalid link:', record);
                }
            });

            // Bind the click handler for the route creation button
            $('#button_route').bind('click', function() {
                removeAllRoutes();
                var markerName = record.name;
                startingPoint = determineStartingPoint();
                if (startingPoint) {
                    addRoute(record, markers[markerName], startingPoint);
                    replaceButtonAndBindYandexLink(record);
                }
            });

            // Bind the click handler for the route creation button
            $('#button_duration_calculate').bind('click', function() {
                removeAllRoutes();
                var markerName = record.name;
                startingPoint = determineStartingPoint();
                if (startingPoint) {
                    addRoute(record, markers[markerName], startingPoint);
                    replaceButtonAndBindYandexLink(record);
                }

            });

            // For the "show_description" button
            $('#button_show_description').bind('click', function() {
                createDescriptionPanel(record); // Pass the record object
            });

        },

        clear: function () {
            $('#button_forum').unbind('click');
            $('#button_route').unbind('click');
            $('#button_duration_calculate').unbind('click');
            $('#button_show_description').unbind('click');
            BalloonContentLayout.superclass.clear.call(this);
        },
    });
}


function addMarker(record) {

    declareBalloonClass(record)

    let preset;
    if (record.search_is_old) {
        preset = 'islands#grayIcon'
    } else if (record.exact_coords) {
        preset = 'islands#greenStretchyIcon'
    } else {
        preset = 'islands#orangeStretchyIcon'
    }

    let iconContent;
    if (record.search_is_old) {
        iconContent = null
    } else {
        iconContent = `${record.display_name}`
    }

    marker = new ymaps.GeoObject({
        geometry: {
            type: "Point",
            coordinates: record.coords
        },
        properties: {
            iconContent: iconContent,
            coordinates: record.coords,
            markerDisplayName: record.display_name, // todo – to delete excessive elements?
            markerFreshness: record.freshness,
            markerLink: record.link,
            markerTopicType: record.search_type,
            record: record
            /*
            // Зададим содержимое всплывающей подсказки.
            hintContent: 'Рога и копыта';*/
        }
    }, {
        preset: preset,
        balloonContentLayout: BalloonContentLayout,
        // Запретим замену обычного балуна на балун-панель.
        // Если не указывать эту опцию, на картах маленького размера откроется балун-панель.
        balloonPanelMaxMapArea: 0,
        balloonMaxWidth: balloonMaxWidth,
    })
    markers[record.name] = marker;
    map.geoObjects.add(marker);
}

function addUserCurrentLocation() {
    var geolocation = ymaps.geolocation;

    // Сравним положение, вычисленное по ip пользователя и
    // положение, вычисленное средствами браузера.
    geolocation.get({
        provider: 'yandex',
        mapStateAutoApply: true
    }).then(function (result) {
        // Красным цветом пометим положение, вычисленное через ip.
        result.geoObjects.options.set('preset', 'islands#redCircleIcon');
        result.geoObjects.get(0).properties.set({
            balloonContentBody: 'Мое местоположение'
        });
        map.geoObjects.add(result.geoObjects);
    });

    geolocation.get({
        provider: 'browser',
        mapStateAutoApply: true
    }).then(function (result) {
        // Синим цветом пометим положение, полученное через браузер.
        // Если браузер не поддерживает эту функциональность, метка не будет добавлена на карту.
        result.geoObjects.options.set('preset', 'islands#blueCircleIcon');
        map.geoObjects.add(result.geoObjects);
    });

}

function addRoute(record, marker, startingPoint) {
    var multiRoute = new ymaps.multiRouter.MultiRoute({
        // Description of the route points.
        referencePoints: [
            startingPoint,
            record.coords
        ],
        // Routing parameters.
        params: {results: 1 // Limit the maximum number of routes returned by the router.
        }
    }, {
        // Automatically set the map boundaries so that the route is fully visible.
        boundsAutoApply: false,
        // Do not show markers
        wayPointVisible: false,
        routeStrokeWidth: 6,
        //routeStrokeColor: ,
        routeActiveStrokeWidth: 8,
        routeActiveStrokeColor: MARKER_COLOR_INACTIVE,
    });

    // TODO – do we need all the below / parts of it?
    // Create buttons to control the multi-route.
    var trafficButton = new ymaps.control.Button({
            data: { content: "Учитывать пробки" },
            options: { selectOnClick: true }
        }),
        viaPointButton = new ymaps.control.Button({
            data: { content: "Добавить транзитную точку" },
            options: { selectOnClick: true }
        });

    // Declare handlers for the buttons.
    trafficButton.events.add('select', function () {
        multiRoute.model.setParams({ avoidTrafficJams: true }, true);
    });

    trafficButton.events.add('deselect', function () {
        multiRoute.model.setParams({ avoidTrafficJams: false }, true);
    });

    viaPointButton.events.add('select', function () {
        var referencePoints = multiRoute.model.getReferencePoints();
        referencePoints.splice(1, 0, "Москва, ул. Солянка, 7");
        multiRoute.model.setReferencePoints(referencePoints, [1]);
    });

    viaPointButton.events.add('deselect', function () {
        var referencePoints = multiRoute.model.getReferencePoints();
        referencePoints.splice(1, 1);
        multiRoute.model.setReferencePoints(referencePoints, []);
    });

    map.geoObjects.add(multiRoute);
    allRoutes.push(multiRoute);
    //map.controls = trafficButton;


    multiRoute.events.add('activeroutechange', function () {
        var activeRoute = multiRoute.getActiveRoute();
        if (activeRoute) {
            // var duration = activeRoute.properties.get("duration"); -- case w/o Traffic
            var durationInTraffic = activeRoute.properties.get("durationInTraffic");
            if (durationInTraffic) {
                // show the actual duration
                var durationElement = document.getElementById('route-duration');
                if (durationElement) {
                    durationElement.style.display = ''; // Make it visible
                    durationElement.textContent = `${durationInTraffic.text}`; // Update the text
                }
                // hide the default duration element
                var durationElementDefault = document.getElementById('route-duration-default');
                if (durationElementDefault) {
                    durationElementDefault.style.display = 'none'; // Make it visible
                }

                if (record.search_is_old !== true) {
                    var newIconContent = `${record.display_name} [${durationInTraffic.text}] `; // [${record.freshness}]`;
                    marker.properties.set('iconContent', newIconContent);
                    marker.properties.set('duration', durationInTraffic);
                }
    
                declareBalloonClass(record);
            }
        }
    });
}

function removeAllRoutes() {
    allRoutes.forEach(function(route) {
        map.geoObjects.remove(route);
    });
    allRoutes = []; // Clear the array
}

function addScrollControl() {

    let touchStartY = 0;
    let lastTouchY = 0;
    let preventNextScroll = false;
    let someThresholdValue = 100;

    document.addEventListener("touchstart", function(event) {
        touchStartY = event.touches[0].clientY;
        lastTouchY = touchStartY;
        preventNextScroll = false;
    }, { passive: false });

    document.addEventListener("touchmove", function(event) {
        let touchY = event.touches[0].clientY;
        let isSwipeDown = touchY > lastTouchY;

        if (isSwipeDown && touchStartY < someThresholdValue) {
            // If the swipe down starts near the top of the screen, we might want to prevent it
            // as it might be intended to close the app. `someThresholdValue` should be determined
            // based on testing.
            preventNextScroll = true;
        }

        lastTouchY = touchY;

        if (preventNextScroll) {
            // Prevent the default action (closing the app) without affecting scrolling
            event.preventDefault();
        }
    }, { passive: false });
}

function determineStartingPoint() {
    if (userHomeCoordinates) {
        return userHomeCoordinates;
    } else if (currentUserLocation) {
        return currentUserLocation;
    } else {
        alert("Для построения маршрута, пожалуйста, разрешите приложению определить ваше положение " +
            "(кнопка в левом верхнем углу карты) " +
            "ИЛИ введите ваши Домашние Коориднаты через меню настроек бота.");
        return null;
    }
}

ymaps.ready(async function () {

    addDarkTheme();
    initMap();
    addCurvedCircle();
    defineGeodesicCirclePoints();
    //drawGeodesicCircle();
    await defineRegionsMultiPolygon();
    await defineUserActiveArea();
    addFogOnMap();
    addHome();
    findBounds();
    setBounds();
    sortMarkers();
    addControls();
    //addDropDownListOfSearchTypes();
    userSearchesList.forEach(marker => {addMarker(marker)});

    //addScrollControl(); // MEMO – made to prevent app closure with swipe-down gesture

    document.getElementById('login_page').style.display = 'none' // removes the loader

});
