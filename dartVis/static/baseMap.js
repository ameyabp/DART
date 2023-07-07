export const nonConusStates = [
    'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
]

function setupAxes(projection) {

}

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

    const topMargin = 0;
    const bottomMargin = 30;
    const leftMargin = 50;
    const rightMargin = 0;

    var projection = d3.geoNaturalEarth1()
                        .rotate([91, 0, 0])
                        .fitExtent([[leftMargin, topMargin], [viewportWidth-rightMargin, viewportHeight-bottomMargin]], 
                            {"type": "Polygon", "coordinates": [[[-126, 22], [-126, 50], [-66, 50], [-66, 22], [-126, 22]]]}); // need clockwise direction

    var path = d3.geoPath().projection(projection);

    // base svg
    var svgMap = d3.select("#geoMap-div")
                    .append("svg")
                    .attr("id", "geoMap-svg")
                    .attr("width", viewportWidth)
                    .attr("height", viewportHeight)
                    .attr("viewBox", [0, 0, viewportWidth, viewportHeight])
                    .append("g")
                    .attr("id", "geo-zoom");

    var zoom = d3.zoom()
                .filter(function(event) {
                    return !event.shiftKey;
                })
                .extent([[leftMargin, topMargin], [viewportWidth-rightMargin, viewportHeight-bottomMargin]])
                .scaleExtent([1,6])
                .translateExtent([[leftMargin, topMargin], [viewportWidth-rightMargin, viewportHeight-bottomMargin]]) 
                .on("zoom", zoomed);

    svgMap.call(zoom);

    // dummy rect to support pan-zoom actions anywhere in the viewport
    svgMap.append("g")
        .append("rect")
        .attr("x", leftMargin)
        .attr("y", topMargin)
        .attr("width", viewportWidth-leftMargin-rightMargin)
        .attr("height", viewportHeight-topMargin-bottomMargin)
        .attr("stroke-width", 0)
        .style("fill", "rgba(138, 210, 255, 0.4)");
    
    // lon-lat grid
    svgMap.append("g")
        .attr("class", "graticule")
        .attr("stroke", "black")
        .attr("stroke-width", 0.1)
        .style("fill", "None")
        .selectAll("path")
        .data([d3.geoGraticule10()])
            .enter()
            .append("path")
            .attr("d", path);

    // US outer border
    svgMap.append("g")
        .attr("class", "states")
        .attr("stroke-width", 0.1)
        .attr("stroke", "rgba(0, 0, 0, 255)")
        .style("fill", "rgba(255, 255, 255, 255)")
        .append("path")
        .datum(topojson.mesh(states_data, states_data.objects.states, function(a,b) {   return a === b  }))
        .attr("d", path);

    // US states (interior) border
    svgMap.select(".states")
        .append("path")
        .datum(topojson.mesh(states_data, states_data.objects.states, function(a,b) {   return a !== b  }))
        .attr("d", path);

    d3.select("#geoMap-svg")
        .append("rect")
        .attr("id", "yAxis-rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", leftMargin)
        .attr("height", viewportHeight)
        .style("fill", "white");

    d3.select("#geoMap-svg")
        .append("rect")
        .attr("id", "xAxis-rect")
        .attr("x", 0)
        .attr("y", viewportHeight-bottomMargin)
        .attr("width", viewportWidth)
        .attr("height", bottomMargin)
        .style("fill", "white");

    const yScale = d3.scaleLinear()
                .domain([projection.invert([leftMargin, viewportHeight-bottomMargin])[1], projection.invert([leftMargin, topMargin])[1]])
                .interpolate(function(a, b) {
                    return function(t) {
                        // denormalize t to get the actual lat value being queried for
                        var lat1 = projection.invert([leftMargin, viewportHeight-bottomMargin])[1];
                        var latn = projection.invert([leftMargin, topMargin])[1];
                        var lat = (latn - lat1) * t + lat1;

                        // map pixel to latitude, longitude does not matter at least for naturalEarth projection
                        return projection([0, lat])[1];
                    }
                });

    const yAxis = d3.axisLeft(yScale)
                    .tickFormat(function(d) {
                        return d + "°"
                    });

    const gY = d3.select("#geoMap-svg")
                .append("g")
                .attr("transform", `translate(${leftMargin}, 0)`)
                .attr("id", "lat-axis")
                .call(yAxis)
                .call(g => g.select(".domain").remove());

    d3.selectAll("#lat-axis>.tick>text")
        .style("font-size", 15);

    const xScale = d3.scaleLinear()
                .domain([projection.invert([leftMargin, viewportHeight-bottomMargin])[0], projection.invert([viewportWidth-rightMargin, viewportHeight-bottomMargin])[0]])
                .interpolate(function(a, b) {
                    return function(t) {
                        // denormalize t to get the actual lon value being queried for
                        var lon1 = projection.invert([leftMargin, viewportHeight-bottomMargin])[0];
                        var lat = projection.invert([leftMargin, viewportHeight-bottomMargin])[1];
                        var lonn = projection.invert([viewportWidth-rightMargin, viewportHeight-bottomMargin])[0];
                        var lon = (lonn - lon1) * t + lon1;

                        // map pixel to longitude, latitude matters here at least for naturalEarth projection
                        return projection([lon, lat])[0];
                    }
                });

    const xAxis = d3.axisBottom(xScale)
                    .tickFormat(function(d) {
                        return d + "°"
                    });

    const gX = d3.select("#geoMap-svg")
                .append("g")
                .attr("transform", `translate(0, ${viewportHeight-bottomMargin})`)
                .attr("id", "lon-axis")
                .call(xAxis)
                .call(g => g.select(".domain").remove());
    
    d3.selectAll("#lon-axis>.tick>text")
        .style("font-size", 15);
    
    function zoomed(event) {
        svgMap.attr("transform", event.transform);
        gY.call(yAxis.scale(yScale.copy().domain([projection.invert(event.transform.invert([leftMargin, viewportHeight-bottomMargin]))[1], projection.invert(event.transform.invert([leftMargin, topMargin]))[1]])))
            .call(g => g.select(".domain").remove());
        gX.call(xAxis.scale(xScale.copy().domain([projection.invert(event.transform.invert([leftMargin, viewportHeight-bottomMargin]))[0], projection.invert(event.transform.invert([viewportWidth-rightMargin, viewportHeight-bottomMargin]))[0]])))
            .call(g => g.select(".domain").remove());
        d3.selectAll("#lon-axis>.tick>text")
            .style("font-size", 15);
        d3.selectAll("#lat-axis>.tick>text")
            .style("font-size", 15);
    }

    return {
        path: path,
        vpWidth: viewportWidth,
        vpheight: viewportHeight,
        leftMargin: leftMargin,
        topMargin: topMargin,
        bottomMargin: bottomMargin,
        rightMargin: rightMargin
    };
}