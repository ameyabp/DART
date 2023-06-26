function populateDropdownForEnsembleModelTimestamps() {
    d3.json('/getEnsembleModelTimestamps',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        d3.select("#controlPanel-div")
            .append("select")
            .attr("id", "selectTimestamp-dropdown")
            .selectAll("option")
            .data(data)
            .join(
                function enter(enter) {
                    enter.append("option")
                        .text(function(d) {
                            return d.substring(0,4) + "/" + d.substring(4,6) + "/" + d.substring(6,8) + " " + d.substring(8) + " hrs"
                        })
                        .attr("value", function(d) {return d})
                }
            )
    })
}

function setupGeographicalMap() {
    // access token from Ameya Patil's mapbox account
    mapboxgl.accessToken = 'pk.eyJ1IjoiYW1leWFwMiIsImEiOiJjbGRwZDc5NmowazlvM3BudnRzaWs1Ymk3In0.-7N-3SUhDatFv6MUgxvZHw'
    const map = new mapboxgl.Map({
        container: 'geoMap-div',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-74.5, 40],
        zoom: 9
      });

    // map.on('load', () => {
    //     map.addLayer({
    //         id: 'rpd_parks',
    //         type: 'fill',
    //         source: {
    //             type: 'vector',
    //             url: 'mapbox://mapbox.3o7ubwm8'
    //         },
    //         'source-layer': 'RPD_Parks',
    //         layout: {
    //             visibility: 'visible'
    //         },
    //         paint: {
    //             'fill-color': 'rgba(61,153,80,0.55)'
    //         }
    //     });
    // });
}

function init() {
    populateDropdownForEnsembleModelTimestamps()
    setupGeographicalMap()
}