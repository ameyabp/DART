import {setupTooltip} from './helper.js';

export const nonConusStates = [
    'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
]

const mapAxesTickLabelFontSize = 10;
const mapAxesLabelFontSize = 15;
// the padding to be added around the region of interest
// to position it in the center of the map projection
// specifed as a percentage of the data bounding box width and height
const projectionExtentBboxPadding = 20;

function setupAxes(projection, sizes) {
    // draw rects to clip map area and render axes on them
    const yRect = d3.select("#geoMap-svg")
                    .append("g")
                    .attr("id", "yAxis-rect")
        
    yRect.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", sizes.leftMargin)
        .attr("height", sizes.viewportHeight)
        .style("fill", "white");

    yRect.append("text")
        .text("LATITUDE")
        .attr("x", -(sizes.viewportHeight-sizes.bottomMargin)/2)
        .attr("y", 0)
        .attr("font-size", mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `rotate(-90)`);

    const xRect = d3.select("#geoMap-svg")
                    .append("g")
                    .attr("id", "xAxis-rect")

    xRect.append("rect")
        .attr("x", 0)
        .attr("y", sizes.viewportHeight-sizes.bottomMargin)
        .attr("width", sizes.viewportWidth)
        .attr("height", sizes.bottomMargin)
        .style("fill", "white");

    xRect.append("text")
        .text("LONGITUDE")
        .attr("x", sizes.leftMargin + (sizes.viewportWidth-sizes.rightMargin)/2)
        .attr("y", sizes.viewportHeight)
        .attr("font-size", mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "baseline");

    // latitiude axis
    const yScale = d3.scaleLinear()
                .domain([projection.invert([sizes.leftMargin, sizes.viewportHeight-sizes.bottomMargin])[1], projection.invert([sizes.leftMargin, sizes.topMargin])[1]])
                .interpolate(function(a, b) {
                    return function(t) {
                        // denormalize t to get the actual lat value being queried for
                        var lat1 = projection.invert([sizes.leftMargin, sizes.viewportHeight-sizes.bottomMargin])[1];
                        var latn = projection.invert([sizes.leftMargin, sizes.topMargin])[1];
                        var lat = (latn - lat1) * t + lat1;

                        // map pixel to latitude, longitude does not matter at least for naturalEarth projection
                        return projection([0, lat])[1];
                    }
                });

    const yAxis = d3.axisLeft(yScale)
                    .tickFormat(function(d) {
                        if (d > 0)
                            return d + "° N";
                        else
                            return Math.abs(d) + "° S";
                    })
                    .ticks(6);

    const gY = d3.select("#geoMap-svg")
                .append("g")
                .attr("transform", `translate(${sizes.leftMargin}, 0)`)
                .attr("id", "lat-axis")
                .call(yAxis)
                .call(g => g.select(".domain").remove());

    d3.selectAll("#lat-axis>.tick>text")
        .style("font-size", mapAxesTickLabelFontSize);

    // longitude
    const xScale = d3.scaleLinear()
                .domain([projection.invert([sizes.leftMargin, sizes.viewportHeight-sizes.bottomMargin])[0], projection.invert([sizes.viewportWidth-sizes.rightMargin, sizes.viewportHeight-sizes.bottomMargin])[0]])
                .range([sizes.leftMargin, sizes.viewportWidth-sizes.rightMargin]);
//                 .interpolate(function(a, b) {
//                     return function(t) {
//                         // denormalize t to get the actual lon value being queried for
//                         var lon1 = projection.invert([sizes.leftMargin, sizes.viewportHeight-sizes.bottomMargin])[0];
//                         var lat = projection.invert([sizes.leftMargin, sizes.viewportHeight-sizes.bottomMargin])[1];
//                         var lonn = projection.invert([sizes.viewportWidth-sizes.rightMargin, sizes.viewportHeight-sizes.bottomMargin])[0];
//                         var lon = (lonn - lon1) * t + lon1;
// console.log(lon, lat, t)
//                         // map pixel to longitude, latitude matters here at least for naturalEarth projection
//                         return projection([lon, lat])[0];
//                     }
//                 });

    const xAxis = d3.axisBottom(xScale)
                    .tickFormat(function(d) {
                        if (d > 0)
                            return d + "° E";
                        else
                            return Math.abs(d) + "° W";
                    })
                    .ticks(10);

    const gX = d3.select("#geoMap-svg")
                .append("g")
                .attr("transform", `translate(0, ${sizes.viewportHeight-sizes.bottomMargin})`)
                .attr("id", "lon-axis")
                .call(xAxis)
                .call(g => g.select(".domain").remove());
    
    d3.selectAll("#lon-axis>.tick>text")
        .style("font-size", mapAxesTickLabelFontSize);

    return {
        yScale: yScale,
        yAxis: yAxis,
        gY: gY,
        xScale: xScale,
        xAxis: xAxis,
        gX: gX
    };
}

function getProjectionExtentBoundingBox(lonMin, latMax, lonMax, latMin) {
    var bboxWidth = lonMax - lonMin;
    var bboxHeight = latMax - latMin;

    const paddingWidth = (bboxWidth * projectionExtentBboxPadding/100.0) / 2;
    const paddingHeight = (bboxHeight * projectionExtentBboxPadding/100.0) / 2;

    lonMin -= paddingWidth;
    lonMax += paddingWidth;
    latMin -= paddingHeight;
    latMax += paddingHeight;
    
    lonMin = lonMin < -180 ? lonMin+360 : lonMin;
    lonMax = lonMax > 180 ? lonMax-360 : lonMax;

    return {
        'type': 'Polygon',
        'coordinates': [
            [
                // need clockwise direction
                [lonMin, latMax],
                [lonMax, latMax],
                [lonMax, latMin],
                [lonMin, latMin],
                [lonMin, latMax]
            ]
        ]
    }
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

    const viewportWidth = document.getElementById('geoMap-div').clientWidth;
    const viewportHeight = document.getElementById('geoMap-div').clientHeight;

    const topMargin = 0;
    const bottomMargin = 50;
    const leftMargin = 75;
    const rightMargin = 0;

    const sizes = {
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        topMargin: topMargin,
        bottomMargin: bottomMargin,
        leftMargin: leftMargin,
        rightMargin: rightMargin
    };

    var projectionExtentBBox = null;
    var dataCentroid = null;
    await d3.json('/getLonLatBoundingBox',
            {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            })
            .then(function(data) {
                projectionExtentBBox = getProjectionExtentBoundingBox(data.bbox.lonMin, data.bbox.latMax, data.bbox.lonMax, data.bbox.latMin);
                dataCentroid = data.centroid;
            })

    var projection = d3.geoNaturalEarth1()
                        .rotate([91, 0, 0])
                        .fitExtent([[leftMargin, topMargin], [viewportWidth-rightMargin, viewportHeight-bottomMargin]], projectionExtentBBox);
                            // getProjectionExtentBoundingBox(-122, 50, -66, 22));

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

    // data group
    svgMap.append("g")
            .attr("id", "wrf-hydro-data");

    var axes = setupAxes(projection, sizes);

    function zoomed(event) {
        svgMap.attr("transform", event.transform);
        axes.gY.call(axes.yAxis.scale(axes.yScale.copy().domain([projection.invert(event.transform.invert([leftMargin, viewportHeight-bottomMargin]))[1], projection.invert(event.transform.invert([leftMargin, topMargin]))[1]])))
            .call(g => g.select(".domain").remove());
        axes.gX.call(axes.xAxis.scale(axes.xScale.copy().domain([projection.invert(event.transform.invert([leftMargin, viewportHeight-bottomMargin]))[0], projection.invert(event.transform.invert([viewportWidth-rightMargin, viewportHeight-bottomMargin]))[0]])))
            .call(g => g.select(".domain").remove());
        d3.selectAll("#lon-axis>.tick>text")
            .style("font-size", mapAxesTickLabelFontSize);
        d3.selectAll("#lat-axis>.tick>text")
            .style("font-size", mapAxesTickLabelFontSize);
    }

    const tooltip = setupTooltip(viewportWidth, viewportHeight);

    return {
        path: path,
        tooltip: tooltip,
        ...sizes
    };
}