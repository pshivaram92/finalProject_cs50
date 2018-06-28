// Google Map
let map;

// adding a user id variable
var id = null;

// Markers for map
let markers = {};

// password popup
var verifyBox = $("#verify");

// Adding default stats
var stateStat = "&nbsp;&nbsp;&nbsp;&nbsp;States:&nbsp;"
var cityStat = "&nbsp;&nbsp;&nbsp;&nbsp;Cities:&nbsp;"
var parkStat = "&nbsp;&nbsp;&nbsp;&nbsp;Parks:&nbsp;"

// Info window
let info = new google.maps.InfoWindow();

// Execute when the DOM is fully loaded
$(document).ready(function() {

    // Styles for map
    // https://developers.google.com/maps/documentation/javascript/styling
    let styles = [

        // Hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // Hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];

    // Options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    let options = {
        center: {lat: 37.09024, lng: -95.712891}, // Stanford, California
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.HYBRID,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 5,
        zoomControl: true,
        zoomControlOptions: {
              position: google.maps.ControlPosition.RIGHT_CENTER
          }
    };

    // Get DOM node in which map will be instantiated
    let canvas = $("#map-canvas").get(0);

    // Instantiate map
    map = new google.maps.Map(canvas, options);

    // Configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);


});


// Add marker for place to map
function addMarker(place)
{
    // Instantiate marker
    marker = new google.maps.Marker({position: new google.maps.LatLng(place.latitude, place.longitude),
                                    map: map,
                                    icon: markerIconCustomize(place)
    });

    // Append marker to list (to remove later)
    markers[place.name] = marker

    google.maps.event.addListener(marker, 'mouseover', (function(marker) {
        return function() {
          showInfo(marker, "<b>"+place.name+"</b>")
        }
      })(marker));


    google.maps.event.addListener(marker, 'click', (function(marker) {
        return function() {
            news = "<h6><a href=\"https://www.google.com/search?q=" + place.name + "\">" + place.name + "</a></h6>"
            if (id != null)
            {
                if (place.is_visited == "Y")
                {
                    news += "<ul><li><input type=" + "\"checkbox\"" + " id=\"" + place.name.replace(/\s+/g, '').replace(/\.+/g,'') + "\" class=" + "\"chb\" checked=\"checked\"" + "/>Visited?</li>"
                }
                else
                {
                    news += "<ul><li><input type=" + "\"checkbox\"" + " id=\"" + place.name.replace(/\s+/g, '').replace(/\.+/g,'') + "\" class=" + "\"chb\"" + "/>Visited?</li>"
                }

            }
            news += "<li><a href=\"https://www.google.com/search?q=hotels near " + place.name + "\">Hotels</a></li>"
            news += "<li><a href=\"https://www.google.com/search?q=food near " + place.name + "\">Food</a></li>"
            news += "<li><a href=\"https://www.google.com/search?q=Airport near " + place.name + "\">Airports</a></li>"
            if (place.type == 'park')
            {
                news += "<li><a href=\"https://www.google.com/search?q=Campsites near " + place.name + "\">Campsites</a></li></ul>"
            }
            else
            {
                news += "</ul>"
            }
            showInfo(marker, news);

            if (id !=null)
            {
                let checkbox = $("#" + place.name.replace(/\s+/g, '').replace(/\.+/g,'')).get(0);

                //add listener to places checkbox
                checkbox.addEventListener('change', function() {
                    markerChecker(checkbox, place.name, place.locationType)
                });
            }
        }
      }

      )(marker));
}


// Configure application
function configure()
{
    // Re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true;
        event.stopPropagation && event.stopPropagation();
        event.cancelBubble && event.cancelBubble();
    }, true);

    // Update UI
    update();

    // Add listener for checkbox clicks
    $(".chb").click(function(){
        update();
    });
}


// Remove markers from map
function removeMarkers()
{
    for(var key in markers) {
        markers[key].setMap(null)
    }
    markers = {}
}


// Search database for typeahead's suggestions
function search(query, syncResults, asyncResults)
{
    // Get places matching query (asynchronously)
    let parameters = {
        q: query
    };
    $.getJSON("/search", parameters, function(data, textStatus, jqXHR) {

        // Call typeahead's callback with search results (i.e., places)
        asyncResults(data);
    });
}


// Show info window at marker with content
function showInfo(marker, content)
{
    // Start div
    let div = "<div id='info'>";
    if (typeof(content) == "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='/static/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // End div
    div += "</div>";

    // Set info window's content
    info.setContent(div);

    // Open info window (if not already open)
    info.open(map, marker);
}


// Update UI's markers
function update()
{
    // Get map's bounds
    let bounds = map.getBounds();
    let ne = bounds.getNorthEast();
    let sw = bounds.getSouthWest();

    // Get zoom level
    let zoomLevel = map.getZoom();

    let checkBoxStatus= $(".chb")

    // Get places within bounds (asynchronously)
    let parameters = {
        ne: `${ne.lat()},${ne.lng()}`,
        q: $("#q").val(),
        sw: `${sw.lat()},${sw.lng()}`,
        zoomLevel: zoomLevel,
        nationalParkCheck: checkBoxStatus.get(0).checked,
        cityCheck: checkBoxStatus.get(1).checked
    };

    $.getJSON("/loginCheck", function(data, textStatus, jqXHR) {
        stateFlipper(data)
    });

    $.getJSON("/update", parameters, function(data, textStatus, jqXHR) {

       // Remove old markers from map
       removeMarkers();

       // Add new markers to map
       for (let i = 0; i < data.length; i++)
       {
           addMarker(data[i]);
       }
    });


};


function openNav() {
    $("#mapsSideNav").get(0).style.width = "250px";
    };

function closeNav() {
    $("#mapsSideNav").get(0).style.width = "0";
};

function markerIconCustomize(place) {
    iconType = {
           path: google.maps.SymbolPath.CIRCLE,
           scale: 5,
           fillColor: "#ffffff",
           fillOpacity: 1,
           strokeColor: "#000000",
           strokeWeight: 1.5
           }
    if (place.locationType == 'park')
        {
            //iconType.strokeColor = "#db0606";
            iconType.path = google.maps.SymbolPath.FORWARD_CLOSED_ARROW;
            scale = 0.5;
            iconType.fillColor = "#db0606";
        }
    else if (place.locationType == 'city')
        {
            //iconType.strokeColor = "#00bbff";
            scale = 1;
            iconType.fillColor = "#00bbff";
        }
    if (place.is_visited == "Y")
    {
        iconType.fillColor = "#36ff00";
        //iconType.strokeColor = "#36ff00";

    }
    return (iconType)
};

function myFunction(button) {
    if (button == "registerButton" && $('#verify').get(0).type == "hidden")
    {
        $('#verify').get(0).type = "password"
    }
    else if (button == "loginButton" || button == "registerButton")
    {
         let parameters = {
             caller: button,
             username: $("#username").get(0).value.toLowerCase(),
             password: $("#password").get(0).value,
             verify: $("#verify").get(0).value
         }
         $.getJSON("/passwordCheck", parameters, function(data, textStatus, jqXHR) {

            if (data.message == "Successfully registered. Please login")
            {
                $("#verify").get(0).type = "hidden"
            }
            $('.modal-body').get(0).innerText = data.message;
            $('#myModal').modal('toggle');

            //Update UI
            update();
        });
    }
    else
    {
        $.getJSON("/logout", function(data, textStatus, jqXHR) {

            $('.modal-body').get(0).innerText = data.message;
            $('#myModal').modal('toggle');
            //Update UI
            update();
        });
    }
}

function stateFlipper(data) {
    if (data.user_id != null)
        {
            id = data.user_id
            $("#logoutButton").get(0).style.display = "block"
            $("#loginButton").get(0).style.display = "None"
            $("#registerButton").get(0).style.display = "None"
            $("#username").get(0).type = "hidden"
            $("#password").get(0).type = "hidden"
            $("#verify").get(0).type = "hidden"
            $.getJSON("/getUserStats", function(data, textStatus, jqXHR) {
                $("#stateStat").get(0).innerHTML = stateStat + data[0].state + "/50"
                $("#cityStat").get(0).innerHTML = cityStat + data[0].city + "/133"
                $("#parkStat").get(0).innerHTML = parkStat + data[0].park + "/58"
                $(".statNav").get(0).style.visibility = "visible"
                $(".statNav").get(1).style.visibility = "visible"
                $(".statNav").get(2).style.visibility = "visible"
            });
        }
    else
        {
            id = null
            $("#logoutButton").get(0).style.display = "None"
            $("#loginButton").get(0).style.display = "block"
            $("#registerButton").get(0).style.display = "block"
            $("#username").get(0).type = "text"
            $("#username").get(0).value = ""
            $("#password").get(0).type = "password"
            $("#password").get(0).value = ""
            $("#verify").get(0).value = ""
            $("#stateStat").get(0).innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;States:&nbsp;"
            $("#cityStat").get(0).innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;Cities:&nbsp;"
            $("#parkStat").get(0).innerHTML = "&nbsp;&nbsp;&nbsp;&nbsp;Parks:&nbsp;"
            $(".statNav").get(0).style.visibility = "hidden"
            $(".statNav").get(1).style.visibility = "hidden"
            $(".statNav").get(2).style.visibility = "hidden"

        }
}

// fuction to colorize marker on visit
function markerChecker (item, locationName, locationType) {
    let name = locationName
    let checked = item.checked

    let parameters = {
        name: name,
        checked: checked,
        locationType: locationType
    }
    $.getJSON("/locationEdit", parameters, function(data, textStatus, jqXHR) {

            //Update UI
            update();
    });
}

// When the user clicks on the password field, show the message box
console.log(verifyBox)
function viewPasswordRequirements() {
    $('.modal-body').get(0).innerHTML = `
                                        <ul>
                                        <li>Password should be between 8 and 32 long</li>
                                        <li>Password should have atleast one number</li>
                                        <li>Password should have atleast one UPPER CASE letter</li>
                                        <li>Password should have atleast one lower case letter</li>
                                        <li>Password should have atleast one lower case letter</li>
                                        <li>Password should contain atleast 1 special character</li>
                                        </ul>
                                            `;
            $('#myModal').modal('toggle');
}

