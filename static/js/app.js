var vm = new Vue({
    el: "#nextbus-tracker",
    data: {
        query: '',
        results: {}
    },
    ready: function() {
        this.initMap();

        // watch the results and update accordingly
        this.$watch("results", function(val) {
            if (this.results)
                $('body').append('results updated!');
        });


    },
    methods: {
        initMap: function() {
            var _this = this;
            
            this.map = new L.Map("nextmap", {center: [37.760665, -122.435199], zoom: 12})
                .addLayer(new L.TileLayer("https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoiam9zaHBvcnRlcjEiLCJhIjoib3JSMlZQTSJ9.OEp-wgOkWI4QnzxCYDnPzg"));

            this.svg = d3.select(this.map.getPanes().overlayPane).append("svg")
            this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");



            d3.json('/static/geojson/arteries.json', function(error, collection) {
                if (error) throw error;

                addFeatures(collection, "artery");
            });
            d3.json('/static/geojson/freeways.json', function(error, collection) {
                if (error) throw error;

                addFeatures(collection, "freeway");
            });

        },
        updateResults: function(event) {
            var _this = this;


            this.results = {
                'test': 'this is a test!'
            }
        },
        updateMap: function(event) {
            var _this = this;
            console.log('asd');
            // $.get("/search/"+_this.query, function (data) {
            //   _this.results = data;
            //   $('#loading').hide();
            // })
        }
    }
});

function addFeatures(collection, cname) {
    var transform = d3.geo.transform({point: projectPoint}),
          path = d3.geo.path().projection(transform);

    // draw the geoJSON paths
    var feature = vm.g.selectAll("path."+cname)
        .data(collection.features)
        .enter()
        .append("path")
            .attr('class', cname)
            .attr('stroke-width', 3)
            .attr('stroke', '#2196F3')
            .attr('fill', 'none');

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
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        vm.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        feature.attr("d", path);
    }
}

// adapt Leaflet points to d3 points
function projectPoint(x, y) {
    var point = vm.map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
}