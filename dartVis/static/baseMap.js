export const nonConusStates = [
    'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
]

export async function drawBaseMap() {
    var states_data = [];
    await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
            .then(function(data) {
                states_data = data;
            });
        
    console.log(states_data);
    
    console.log(topojson.feature(states_data, states_data.objects.states).features.filter(function(d) {
        return !nonConusStates.includes(d.properties.name);
    }));

    const viewportWidth = 1100;//d3.select("#geoMap-div").attr("width");
    const viewportHeight = 500;//d3.select("#geoMap-div").attr("height");

    var projection = d3.geoNaturalEarth1()
                        // .fitExtent([[0,0], [viewportWidth, viewportHeight]]);
                        .scale(1000)
                        .rotate([91.0168, -32.6032, 0]);
                        

    var path = d3.geoPath().projection(projection);

    var svgMap = d3.select("#geoMap-div")
                    .append("svg")
                    .attr("width", viewportWidth)
                    .attr("height", viewportHeight)
                    .attr("viewBox", [0, 0, viewportWidth, viewportHeight])
                    .style("background-color", "rgba(220, 220, 220, 255)")
                    .append("g")
                    .attr("id", "geo-zoom");

    var zoom = d3.zoom()
                // .filter(function(event) {
                // return !event.shiftKey;
                // })
                .extent([[0,0], [viewportWidth, viewportHeight]])
                .scaleExtent([1,8])
                .translateExtent([[0,0], [viewportWidth, viewportHeight]]) 
                .on("zoom", zoomed);

    function zoomed(event) {
        svgMap.attr("transform", event.transform);
    }

    svgMap.call(zoom);

    svgMap.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(states_data, states_data.objects.states).features.filter(function(d) {
            return !nonConusStates.includes(d.properties.name);
        }))
        .enter()
        .append("path")
        .attr("d", function(d) {
            return path(d);
        })
        .attr("id", function(d) {
            return d.properties.name;
        })
        .attr("stroke", "black")
        .attr("stroke-width", 0.5)
        .style("fill", "rgba(255, 255, 255, 255)");

    // console.log(topojson.mesh(states_data, states_data.objects.states, function(a, b) {
    //     return a !== b;
    // }))

    // svgMap.append("g")
    //     .datum(topojson.mesh(states_data, states_data.objects.states, function(a, b) {
    //         return a !== b;
    //     }))
    //     .attr("class", "states")
    //     .attr("d", "path")

    // svgMap.append("g")
    //     .attr("class", "graticule")
    //     .selectAll("path")
    //     .data([d3.geoGraticule10()])
    //     .enter()
    //     .append("path")
    //     .attr("d", path)
    //     .attr("stroke", "black")
    //     .attr("stroke-width", 0.5)
    //     .style("fill", "None");
}