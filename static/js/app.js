var vm = new Vue({
    el: "#nextbus-tracker",
    data: {
        query: '',
        results: {},
        buses: {},
        routes: {},
        toggledRoutes: {}
    },
    ready: function() {
        this.initMap();

        // watch the results and update accordingly
        this.$watch("results", function(val) {
            if (this.results)
                this.updateMap();
        });

    },
    methods: {

        /*
        *   Initialize the map with the road data
        */
        initMap: function() {
            var _this = this;

            $('#nextmap').css('height', window.innerHeight-80+"px")

            this.map = new L.Map("nextmap", {center: [37.760665, -122.435199], zoom: 12})
                .addLayer(new L.TileLayer("https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoiam9zaHBvcnRlcjEiLCJhIjoib3JSMlZQTSJ9.OEp-wgOkWI4QnzxCYDnPzg"));

            this.svg = d3.select(this.map.getPanes().overlayPane).append("svg").attr('class', 'leaflet-roads')
            this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");

            // convert latlng to d3 geo points
            this.transform = d3.geo.transform({point: projectPoint});

            // get map features
            d3.json('/static/geojson/arteries.json', function(error, collection) {
                if (error) throw error;
                addFeatures(collection, "artery");
            });
            d3.json('/static/geojson/freeways.json', function(error, collection) {
                if (error) throw error;
                addFeatures(collection, "freeway");
            });

            this.updateResults();
        },

        /*
        *   Fetches new bus data and updates it in the model
        */
        updateResults: function(event) {
            var _this = this;
            clearTimeout(this.timer);

            d3.xml('http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=1144953500233', 'application/xml', function(error, xml){
                if(error) throw error;

                var buses = xml.documentElement.getElementsByTagName("vehicle");
                _this.results=buses;

            });
            this.timer = setTimeout(this.updateResults, 15000);
        },

        updateRouteToggles: function() {
            console.log(event, this.routes)
        },

        /*
        *   Adds buses to the map and updates their coordinates
        */
        updateMap: function(event) {
            var _this = this;

            for(var i in _this.results){
                if(i === 'length') break;
                var bus = _this.results[i];
                var latlng = new L.LatLng(bus.getAttribute('lat'), bus.getAttribute('lon'));
                var id = bus.getAttribute('id');
                var routeTag = bus.getAttribute('routeTag');
                var speed = bus.getAttribute('speedKmHr');

                if(!(routeTag in vm.routes)){
                    vm.routes[routeTag] = L.featureGroup([]).addTo(_this.map);
                }

                if(id in vm.buses){
                    vm.buses[id].setLatLng(latlng);
                    vm.buses[id].setStyle({
                        color: vm._getColor(speed),
                        fillColor: vm._getColor(speed)
                    });
                    vm.buses[id]._popup.setLatLng(latlng);
                } else {
                    var speedClass = (parseInt(speed) === 0 ) ? "text-danger" : "text-success";

                    vm.buses[id] = L.circle(latlng, 50, {
                        id: id,
                        color: vm._getColor(speed),
                        fillColor: vm._getColor(speed),
                        fillOpacity: 0.5,
                        className: "bus_marker route_"+routeTag+" bus_"+id,
                        title: "Bus #"+id
                    })
                    .bindPopup("<dl>"+
                        "<dt>Bus #</dt><dd>"+id+"</dd>"+
                        "<dt>Route</dt><dd>"+routeTag+"</dd>"+
                        "<dt>Speed</dt><dd class='"+speedClass+"'>"+speed+" km/h"+"</dd>"+
                        "<dt>Last Updated</dt><dd>"+bus.getAttribute('secsSinceReport')+"s ago</dd>"+
                        "</dl>"+
                        "<button class='btn btn-default btn-xs btn-block toggle-route' onclick='vm.toggleRoute(\""+routeTag+"\")'>Toggle Route</button>"+
                        "<button class='btn btn-default btn-xs btn-block hide-except' onclick='vm.hideExcept(\""+routeTag+"\")'>Hide Other Routes</button>"+
                        "<button class='btn btn-default btn-xs btn-block show-all' onclick='vm.showAll()'>Show All Routes</button>"
                    );
                    
                    vm.buses[id].addTo(vm.routes[routeTag]);
                }

            }
            vm._updateRouteToggles();
        },

        toggleRoute: function(routeTag){
            $('.route_'+routeTag).toggle();
        },
        hideExcept: function(routeTag){
            $('.bus_marker:not(.route_'+routeTag+')').hide();
            $('.route_'+routeTag).show();
        },
        showAll: function(){
            $('.bus_marker').show();
        },

        _updateRouteToggles: function(){
            var wrapper = $('#route_toggles');
            for(var routeTag in vm.routes){
                var buses = Object.keys(vm.routes[routeTag]._layers).length;
                console.log(buses)
                wrapper.append("<li class='list-group-item'><span class='badge'>"+parseInt(buses)+" buses</span><input type='checkbox' name='toggleRoute' value='"+routeTag+"' checked/><b>"+routeTag+"</b></li>")
            }
        },

        // get color based on speed
        _getColor: function(speed){
            if(parseInt(speed) === 0) return "#E51C23";
            else return "#4CAF50";
        }
    }
});

/*
*   Adds the roads to the map, utilizing transforms to make d3 and Leaflet coords work
*   collection - GeoJSON containing the roads
*   cname - className to separate arteries from freeways
*/
function addFeatures(collection, cname) {
    var path = d3.geo.path().projection(vm.transform);

    // draw the geoJSON paths
    var feature = vm.g.selectAll("path."+cname)
        .data(collection.features)
        .enter()
        .append("path")
            .attr({
                'class': cname,
                'stroke-width': 3,
                'stroke': '#2196F3',
                'fill': 'none'
            });

    vm.map.on("viewreset", reset);
    reset();

    // Reposition the SVG to cover the features.
    function reset() {
        var bounds = path.bounds(collection),
            topLeft = bounds[0],
            bottomRight = bounds[1];

        // resize and move the SVG
        vm.svg.attr("width", bottomRight[0] - topLeft[0])
            .attr("height", bottomRight[1] - topLeft[1])
            .style({
                "left": topLeft[0] + "px",
                "top": topLeft[1] + "px"
            });

        vm.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        feature.attr("d", path);
    }
}

// adapt Leaflet points to d3 points
function projectPoint(x, y) {
    var point = vm.map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}