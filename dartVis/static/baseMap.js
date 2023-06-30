export const nonConusStates = [
    'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
]

export async function drawBaseMap() {
    var states_data = [];
    await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
            .then(function(data) {
                states_data = data;
            });
        
    // filter out non continental US states
    states_data.objects.states.geometries = states_data.objects.states.geometries.filter(function(d) {
        return !nonConusStates.includes(d.properties.name);
    });

    var geoMapDivSize = d3.select("#geoMap-div").node().getBoundingClientRect();

    const viewportWidth = geoMapDivSize.width;
    const viewportHeight = geoMapDivSize.height;

    var projection = d3.geoNaturalEarth1()
                        .rotate([91, 0, 0])
                        .fitExtent([[0,0], [viewportWidth, viewportHeight]], {"type": "Polygon", "coordinates": [[[-126, 24], [-126, 50], [-66, 50], [-66, 24], [-126, 24]]]}); // need clockwise direction

    var path = d3.geoPath().projection(projection);

    var svgMap = d3.select("#geoMap-div")
                    .append("svg")
                    .attr("width", viewportWidth)
                    .attr("height", viewportHeight)
                    .attr("viewBox", [0, 0, viewportWidth, viewportHeight])
                    .append("g")
                    .attr("id", "geo-zoom");

    var zoom = d3.zoom()
                .filter(function(event) {
                    return !event.shiftKey;
                })
                .extent([[0,0], [viewportWidth, viewportHeight]])
                .scaleExtent([1,6])
                .translateExtent([[0,0], [viewportWidth, viewportHeight]]) 
                .on("zoom", zoomed);

    function zoomed(event) {
        svgMap.attr("transform", event.transform);
    }

    svgMap.call(zoom);

    // US outer border
    svgMap.append("g")
        .attr("class", "states")
        .append("path")
        .datum(topojson.mesh(states_data, states_data.objects.states, function(a,b) {   return a === b  }))
        .attr("d", path)
        .attr("stroke-width", 0.1)
        .attr("stroke", "rgba(0, 0, 0, 255)")
        .style("fill", "rgba(255, 255, 255, 0)");

    // US states (interior) border
    svgMap.select(".states")
        .append("path")
        .datum(topojson.mesh(states_data, states_data.objects.states, function(a,b) {   return a !== b  }))
        .attr("stroke-width", 0.1)
        .attr("stroke", "rgba(0, 0, 0, 255)")
        .attr("d", path)
        .style("fill", "rgba(255, 255, 255, 255)");

    return path;
}