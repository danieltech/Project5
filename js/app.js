// data model for markers
var markerClass = function(marker, name, category, position) {
  this.marker = marker,
  this.name = name,
  this.category = category,
  this.position = position
};


// View Model of the app.
function MapViewModel() {
  var self = this;
  
  var map;
  var service;
  var newLocation; // new location
  var infowindow;

  var myneighMark = [];
  var locations = []; // locations in the map. can show up all, or only the filtered ones.
  var Neighborhood = "New York"; // the app starts centered in New York
  self.myBoolean=ko.observable(true); //this boolean is used to toogle the listview on the right screen.

  self.topPicksList = ko.observableArray([]); // popular places in defined neighbor hood
  self.myFilteredList = ko.observableArray(self.topPicksList()); // places filtered by searching
  self.neighborhood = ko.observable(Neighborhood); // defined neighborhood
  self.keyword = ko.observable(''); // search keyword. This keyword is used for place filtering
  
  
  
  // init map
  initMap();


  // method to start the map
  function initMap() {
    var mapOptions = {
      zoom: 14,
      disableDefaultUI: true
    };
    map = new google.maps.Map(document.querySelector('#map'), mapOptions);
    infowindow = new google.maps.InfoWindow();
  }


  self.setToggle = function() {
    if (self.myBoolean() == true) {
      self.myBoolean(false);
    }else{
      self.myBoolean(true);
    }
  };

  
  // fitting map height to window size
  self.mapSize = ko.computed(function() {
    $("#map").height($(window).height());
  });

  

  // once we are centered on a map location (lets say New York),
  // this computed function triggers the amount of markers shown according to what we want to search
  // on the map (the keyword variable comes from index.html).
  self.displayMarkers = ko.computed(function() {
    filterMarkers(self.keyword().toLowerCase());
  });


  // in here we filter the markers stored in locations. When a new search starts, first we
  // have to setMap again so the marker shows up on the map (it was done on previous filtering).
  function filterMarkers(keyword) {
    for (var i in locations) {
      if (locations[i].marker.map === null) {
        locations[i].marker.setMap(map);
      }
      if (locations[i].name.indexOf(keyword) === -1 &&
        locations[i].category.indexOf(keyword) === -1) {
        locations[i].marker.setMap(null);
      }
    }
  }


  // update the neighborhood. 
  self.computedNeighborhood = ko.computed(function() {
    if (self.neighborhood() != '') {
      if (locations.length > 0) {
        removelocations();
      }
      removeNeighborhoodMarker();
      requestNeighborhood(self.neighborhood());
      self.keyword('');
    }
  });


  // remove markers of popular places from the map
  // this method is called when neighborhood is newly defined
  function removelocations() {
    for (var i in locations) {
      locations[i].marker.setMap(null);
      locations[i].marker = null;
    }
    while (locations.length > 0) {
      locations.pop();
    }
  }


  // remove neighborhood marker from the map when a new one is searched.
  function removeNeighborhoodMarker() {
    for (var i in myneighMark) {
      myneighMark[i].setMap(null);
      myneighMark[i] = null;
    }
    while (myneighMark.length > 0) {
      myneighMark.pop();
    }
  }


  // request neighborhood location data from PlaceService
  function requestNeighborhood(neighborhood) {
    var request = {
      query: neighborhood
    };
    service = new google.maps.places.PlacesService(map);
    service.textSearch(request, neighborhoodCallback);
  }


  // callback method for neighborhood location
  function neighborhoodCallback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
      getInformation(results[0])
    }
  }




  // trigger click event to markers when list item is clicked
  self.clickMarker = function(venue) {
    var venueName = venue.venue.name.toLowerCase();
    for (var i in locations) {
      if (locations[i].name === venueName) {
        google.maps.event.trigger(locations[i].marker, 'click');
        map.panTo(locations[i].position);
      }
    }
  };



  // update list view based on search keyword
  self.displayList = ko.computed(function() {
    var venue;
    var list = [];
    var keyword = self.keyword().toLowerCase();
    for (var i in self.topPicksList()) {
      venue = self.topPicksList()[i].venue;
      if (venue.name.toLowerCase().indexOf(keyword) != -1 ||
        venue.categories[0].name.toLowerCase().indexOf(keyword) != -1) {
        list.push(self.topPicksList()[i]);
      }
    }
    self.myFilteredList(list);
  });
  

    



  // set neighborhood marker on the map and get popular places from FourSquare API 
  function getInformation(data) {
    var lat = data.geometry.location.lat();
    var lng = data.geometry.location.lng();
    var name = data.name;
    newLocation = new google.maps.LatLng(lat, lng);
    map.setCenter(newLocation);

    // neighborhood marker
    var marker = new google.maps.Marker({
      map: map,
      position: data.geometry.location,
      title: name
    });
    myneighMark.push(marker);

    // neighborhood marker listener
    google.maps.event.addListener(marker, 'click', function() {
      infowindow.setContent(name);
      infowindow.open(map, marker);
    });

    // request popular places 
    foursquareBaseUri = "https://api.foursquare.com/v2/venues/explore?ll=";
    baseLocation = lat + ", " + lng;
    extraParams = "&limit=20&section=topPicks&day=any&time=any&locale=en&oauth_token=5WJZ5GSQURT4YEG251H42KKKOWUNQXS5EORP2HGGVO4B14AB&v=20141121";
    foursquareQueryUri = foursquareBaseUri + baseLocation + extraParams;

    $.getJSON(foursquareQueryUri, function(data) {
      self.topPicksList(data.response.groups[0].items);
      for (var i in self.topPicksList()) {
        createMarkers(self.topPicksList()[i].venue);
      }
    });
  }


  // create map markers of popular places near the selected location
  function createMarkers(venue) {
    console.log(venue);
    var lat = venue.location.lat;
    var lng = venue.location.lng;
    var name = venue.name;
    var address = venue.location.formattedAddress;
    var position = new google.maps.LatLng(lat, lng);
    var category = venue.categories[0].name;
    var myrating = venue.rating;

   
    // marker of a popular place
    var marker = new google.maps.Marker({
      map: map,
      position: position,
      title: name
    });
    locations.push(new markerClass(marker, name.toLowerCase(), category.toLowerCase(), position));


    // DOM element for infowindow content
    var dom = name + '<br><br>' + category + '<br><br>' + address + '<br><br><p>FourSquareRating: </p>' + myrating;
      
    
    google.maps.event.addListener(marker, 'click', function() {
      //infowindow.setContent(dom + endingToken + fsToken);
      infowindow.setContent(dom);
      infowindow.open(map, this);
      map.panTo(position);
    });
  }

  

 
} // end MapViewModel


// initialize the view model binding
$(function() {
  ko.applyBindings(new MapViewModel());
});
