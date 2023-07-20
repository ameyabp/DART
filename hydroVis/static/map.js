import { uiParameters } from './uiParameters.js';
import { setupTooltip, wrfHydroStateVariables } from './helper.js';
import { drawDistribution } from "./distribution.js";
import { drawHydrographStateVariable, drawHydrographInflation } from "./hydrograph.js";

class mapPlotParams {
    static nonConusStates = [
        'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
    ];

    static mapAxesTickLabelFontSize = 10;
    static mapAxesLabelFontSize = 15;
    // the padding to be added around the region of interest
    // to position it in the center of the map projection
    // specifed as a percentage of the data bounding box width and height
    static projectionExtentBboxPadding = 20;
    
    static topMargin = 0;
    static bottomMargin = 50;
    static leftMargin = 75;
    static rightMargin = 0;
    static mapWidth = 0;
    static mapHeight = 0;

    static setMapSize(width, height) {
        this.mapWidth = width;
        this.mapHeight = height;
        this.legendLeftX = this.leftMargin + (width - this.leftMargin - this.rightMargin) * 0.02;
        this.legendTopY = this.topMargin + (height - this.topMargin - this.bottomMargin) * 0.9;
    }

    static colorInterpolator = d3.interpolateWarm;
    static getMapColorScale(data) {
        return d3.scaleSequential(this.colorInterpolator)
                .domain(data);
    }

    static sizeRange = [0.5, 10];
    static getMapSizeScale(data) {
        return d3.scaleLinear()
                .domain(data)
                .range(this.sizeRange);
    }

    static projection = null;
    static path = null;

    static setProjectionAndPath(projection, path) {
        this.projection = projection;
        this.path = path;
    }

    static tooltip = null;
    static setTooltip(tt) {
        this.tooltip = tt;
    }

    static legendLeftX = 0;
    static legendTopY = 0;
    static legendRectWidth = 0.7;
    static legendRectMinHeight = 5;
    static legendRectMaxHeight = 20;
    static legendRectCount = 256;
    static legendNumTicks = 3;
    static legendTickHeight = 25;
    static legendTickFontSize = 12;
    static legendTitleFontSize = 15;
    static legendSubtitleFontSize = 12;
    static legendTitleVerticalOffset = -40;

    static generateLegendRects() {
        var legend = []
        for (var i=0; i<this.legendRectCount; i++) {
            const rect = {
                x: i * this.legendRectWidth,
                y: 0,
                width: this.legendRectWidth,
                height: this.legendRectMinHeight + this.legendRectMaxHeight * i/this.legendRectCount,
                color: this.colorInterpolator(i/256)
            }
            legend.push(rect);
        }
        return legend;
    }

    static generateLegendTicks(data) {
        const stateVariable = uiParameters.stateVariable;
        const inflation = uiParameters.inflation;
        const aggregation = uiParameters.aggregation;
        const daStage = uiParameters.daStage;
        const timestamp = uiParameters.timestamp;

        const min = Math.round(d3.min(data) * 100) / 100;
        const max = Math.round(d3.max(data) * 100) / 100;

        var ticks = [];
        for (var i=0; i<this.legendNumTicks; i++) {
            const tick = {
                x: (this.legendRectWidth * this.legendRectCount) * i/(this.legendNumTicks-1),
                y1: 0,
                y2: this.legendTickHeight,
                label: d3.format("0.3")(min + (max-min) * i/(this.legendNumTicks-1)),
                fontSize: this.legendTickFontSize,
                textType: 'tick'
            }
            ticks.push(tick);
        }

        // ticks
        d3.select("#mapLegend")
            .selectAll("line")
            .data(ticks, d => d.label)
            .join(
                function enter(enter) {
                    enter.append("line")
                        .attr("x1", function(d) {    return d.x; })
                        .attr("y1", function(d) {    return d.y1; })
                        .attr("x2", function(d) {    return d.x; })
                        .attr("y2", function(d) {    return d.y2; })
                        .attr("stroke-width", 1)
                        .attr("stroke", "black");
                }
            );

        var labelTitle = ''
        if (inflation)
            labelTitle = `${aggregation == 'mean' ? 'Mean' : 'Standard Deviation'} of ${daStage == 'preassim' ? 'Forecast' : 'Analysis'} for ${inflation == 'priorinf' ? 'Prior' : 'Posterior'} Inflation on ${wrfHydroStateVariables[stateVariable].commonName}`
        else
            labelTitle = `${aggregation == 'mean' ? 'Mean' : 'Standard Deviation'} of ${daStage == 'preassim' ? 'Forecast' : 'Analysis'} for ${wrfHydroStateVariables[stateVariable].commonName}`

        ticks.push({
            x: 0,
            y1: this.legendTitleVerticalOffset,
            label: labelTitle,
            fontSize: this.legendTitleFontSize,
            textType: 'legendTitle'
        });

        ticks.push({
            x: 0,
            y1: this.legendTitleVerticalOffset/2,
            label: 'in ' + wrfHydroStateVariables[stateVariable].units,
            fontSize: this.legendTickFontSize,
            textType: 'legendSubtitle'
        })

        // tick labels
        d3.select("#mapLegend")
            .selectAll("text")
            .data(ticks, d => d.label)
            .join(
                function enter(enter) {
                    enter.append("text")
                        .html(function(d) { return d.label; })
                        .attr("x", function(d) {  return d.x;   })
                        .attr("y", function(d) {    return d.y1-5; })
                        .attr("text-anchor", function(d) {
                            if (d.textType === 'tick')
                                return "middle";
                            else
                                return "left";
                        })
                        .attr("alignment-baseline", "baseline")
                        .attr("font-size", function(d) {    return d.fontSize;  });
                },
                function update(update) {
                    update.html(function(d) { return d.label; });
                }
            );
        
    }
}

function setupAxes() {
    // draw rects to clip map area and render axes on them
    const yRect = d3.select("#geoMap-svg")
                    .append("g")
                    .attr("id", "yAxis-rect")
        
    yRect.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", mapPlotParams.leftMargin)
        .attr("height", mapPlotParams.mapHeight)
        .style("fill", "white");

    yRect.append("text")
        .text("LATITUDE")
        .attr("x", -(mapPlotParams.mapHeight-mapPlotParams.bottomMargin)/2)
        .attr("y", 0)
        .attr("font-size", mapPlotParams.mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `rotate(-90)`);

    const xRect = d3.select("#geoMap-svg")
                    .append("g")
                    .attr("id", "xAxis-rect")

    xRect.append("rect")
        .attr("x", 0)
        .attr("y", mapPlotParams.mapHeight-mapPlotParams.bottomMargin)
        .attr("width", mapPlotParams.mapWidth)
        .attr("height", mapPlotParams.bottomMargin)
        .style("fill", "white");

    xRect.append("text")
        .text("LONGITUDE")
        .attr("x", mapPlotParams.leftMargin + (mapPlotParams.mapWidth-mapPlotParams.rightMargin)/2)
        .attr("y", mapPlotParams.mapHeight)
        .attr("font-size", mapPlotParams.mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "baseline");

    // latitiude axis
    const yScale = d3.scaleLinear()
                .domain([mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[1], mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin])[1]])
                .interpolate(function(a, b) {
                    return function(t) {
                        // denormalize t to get the actual lat value being queried for
                        var lat1 = mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[1];
                        var latn = mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin])[1];
                        var lat = (latn - lat1) * t + lat1;

                        // map pixel to latitude, longitude does not matter at least for naturalEarth projection
                        return mapPlotParams.projection([0, lat])[1];
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
                .attr("transform", `translate(${mapPlotParams.leftMargin}, 0)`)
                .attr("id", "lat-axis")
                .call(yAxis)
                .call(g => g.select(".domain").remove());

    d3.selectAll("#lat-axis>.tick>text")
        .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);

    // longitude
    const xScale = d3.scaleLinear()
                .domain([mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[0], mapPlotParams.projection.invert([mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[0]])
                .range([mapPlotParams.leftMargin, mapPlotParams.mapWidth-mapPlotParams.rightMargin]);
//                 .interpolate(function(a, b) {
//                     return function(t) {
//                         // denormalize t to get the actual lon value being queried for
//                         var lon1 = projection.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[0];
//                         var lat = projection.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[1];
//                         var lonn = projection.invert([mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin])[0];
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
                .attr("transform", `translate(0, ${mapPlotParams.mapHeight-mapPlotParams.bottomMargin})`)
                .attr("id", "lon-axis")
                .call(xAxis)
                .call(g => g.select(".domain").remove());
    
    d3.selectAll("#lon-axis>.tick>text")
        .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);

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

    const paddingWidth = (bboxWidth * mapPlotParams.projectionExtentBboxPadding/100.0) / 2;
    const paddingHeight = (bboxHeight * mapPlotParams.projectionExtentBboxPadding/100.0) / 2;

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

export async function setupBaseMap() {
    var states_data = [];
    await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
            .then(function(data) {
                states_data = data;
            });
        
    // filter out non continental US states
    states_data.objects.states.geometries = states_data.objects.states.geometries.filter(function(d) {
        return !mapPlotParams.nonConusStates.includes(d.properties.name);
    });

    const viewportWidth = document.getElementById('geoMap-div').clientWidth;
    const viewportHeight = document.getElementById('geoMap-div').clientHeight;

    mapPlotParams.setMapSize(viewportWidth, viewportHeight);

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
                        .fitExtent([
                            [mapPlotParams.leftMargin, mapPlotParams.topMargin], 
                            [mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]
                        ], projectionExtentBBox);

    var path = d3.geoPath().projection(projection);

    mapPlotParams.setProjectionAndPath(projection, path);

    // base svg
    var svgMap = d3.select("#geoMap-div")
                    .append("svg")
                    .attr("id", "geoMap-svg")
                    .attr("width", mapPlotParams.mapWidth)
                    .attr("height", mapPlotParams.mapHeight)
                    .attr("viewBox", [0, 0, mapPlotParams.mapWidth, mapPlotParams.mapHeight])
                    .append("g")
                    .attr("id", "geo-zoom");

    var zoom = d3.zoom()
                // .filter(function(event) {
                //     return !event.shiftKey;
                // })
                .extent([
                    [mapPlotParams.leftMargin, mapPlotParams.topMargin], 
                    [mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]
                ])
                .scaleExtent([1,6])
                .translateExtent([
                    [mapPlotParams.leftMargin, mapPlotParams.topMargin],
                    [mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]
                ])
                .on("zoom", zoomed);

    svgMap.call(zoom);

    // dummy rect to support pan-zoom actions anywhere in the viewport
    svgMap.append("g")
        .append("rect")
        .attr("x", mapPlotParams.leftMargin)
        .attr("y", mapPlotParams.topMargin)
        .attr("width", mapPlotParams.mapWidth-mapPlotParams.leftMargin-mapPlotParams.rightMargin)
        .attr("height", mapPlotParams.mapHeight-mapPlotParams.topMargin-mapPlotParams.bottomMargin)
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

    // hydro gauge data group
    svgMap.append("g")
        .attr("id", "gauge-locations-data");

    // hydro data group
    svgMap.append("g")
            .attr("id", "wrf-hydro-data");

    var axes = setupAxes();

    function zoomed(event) {
        svgMap.attr("transform", event.transform);

        axes.gY.call(axes.yAxis.scale(axes.yScale.copy().domain([projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]))[1], projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin]))[1]])))
            .call(g => g.select(".domain").remove());

        d3.selectAll("#lon-axis>.tick>text")
            .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);

        axes.gX.call(axes.xAxis.scale(axes.xScale.copy().domain([projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]))[0], projection.invert(event.transform.invert([mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.mapHeight-mapPlotParams.bottomMargin]))[0]])))
            .call(g => g.select(".domain").remove());

        d3.selectAll("#lat-axis>.tick>text")
            .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);
    }

    const tooltip = setupTooltip(mapPlotParams.mapWidth, mapPlotParams.mapHeight);
    mapPlotParams.setTooltip(tooltip);

    // legend
    d3.select("#geoMap-svg")
        .append("g")
        .attr("id", "mapLegend")
        .attr("transform", `translate(${mapPlotParams.legendLeftX}, ${mapPlotParams.legendTopY})`)
        .selectAll("rect")
        .data(mapPlotParams.generateLegendRects())
        .enter()
            .append("rect")
            .attr("x", function(d) {    return d.x; })
            .attr("y", function(d) {    return d.y; })
            .attr("width", function(d) {    return d.width; })
            .attr("height", function(d) {    return d.height; })
            .style("stroke-width", 0)
            .style("fill", function(d) {    return d.color; })
            .style("opcaity", 1);
}

export async function drawMapData() {
    const stateVariable = uiParameters.stateVariable;
    const aggregation = uiParameters.aggregation;
    const daStage = uiParameters.daStage;
    const inflation = uiParameters.inflation;
    const timestamp = uiParameters.timestamp;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data

    d3.json('/getStateData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
                stateVariable: stateVariable,
                aggregation: aggregation,
                daStage: daStage,
                inflation: inflation,
                timestamp: timestamp,
            })
    })
    .then(function(wrf_hydro_data) {
        console.log(wrf_hydro_data);

        var colorScale = mapPlotParams.getMapColorScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));
        var sizeScale = mapPlotParams.getMapSizeScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));

        d3.select("#wrf-hydro-data")
            .selectAll("path")
            .data(wrf_hydro_data, d => d.linkID)
            .join(
                function enter(enter) {
                    enter.append("path")
                        .attr("d", function(d) {    return mapPlotParams.path(d.line); })
                        .attr("stroke-width", function(d) {
                            return sizeScale(d[stateVariable]);
                        })
                        .attr("stroke", function(d) {
                            return colorScale(d[stateVariable]);
                        })
                        .style("fill", "None")
                        .on("mouseover", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", 2 * sizeScale(d[stateVariable]));
                            
                                mapPlotParams.tooltip.display(d);
                        })
                        .on("mousemove", function(event, d) {
                            mapPlotParams.tooltip.move(event)
                        })
                        .on("mouseout", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", sizeScale(d[stateVariable]));

                            mapPlotParams.tooltip.hide();
                        })
                        .on("click", function(event, d) {
                            uiParameters.updateLinkSelection(d.linkID, d.line.coordinates[0], d.line.coordinates[1]);
                            uiParameters.updateReadFromGaugeLocation(false);
                            drawDistribution();
                            drawHydrographStateVariable();
                            drawHydrographInflation();
                        });
                },
                function update(update) {
                    update.attr("d", function(d) {    return mapPlotParams.path(d.line); })
                        .attr("stroke-width", function(d) {
                            return sizeScale(d[stateVariable]);
                        })
                        .attr("stroke", function(d) {
                            return colorScale(d[stateVariable]);
                        })
                        .on("mouseover", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", 2 * sizeScale(d[stateVariable]));
                            
                                mapPlotParams.tooltip.display(d);
                        })
                        .on("mousemove", function(event, d) {
                            mapPlotParams.tooltip.move(event)
                        })
                        .on("mouseout", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", sizeScale(d[stateVariable]));

                            mapPlotParams.tooltip.hide();
                        });
                }
            )

        mapPlotParams.generateLegendTicks(wrf_hydro_data.map(d => d[stateVariable]), stateVariable);
    })
}

export function drawGaugeLocations() {
    const showGaugeLocations = uiParameters.showGaugeLocations;

    if (showGaugeLocations) {
        d3.json('/getGaugeLocations',
        {
            method: 'GET',
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        })
        .then(function(data) {

                d3.select("#gauge-locations-data")
                    .selectAll("circle")
                    .data(data)
                    .enter()
                        .append("circle")
                        .attr("cx", function(d) {
                            return mapPlotParams.projection([d.location[0], d.location[1]])[0];
                        })
                        .attr("cy", function(d) {
                            return mapPlotParams.projection([d.location[0], d.location[1]])[1];
                        })
                        .attr("r", 2)
                        .attr("stroke-width", 0)
                        .attr("stroke", "black")
                        .style("fill", "#e31a1c")
                        .style("opacity", 0.5)
                        .on("mouseover", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", 1);
                            
                                mapPlotParams.tooltip.display(d.location);
                        })
                        .on("mousemove", function(event, d) {
                            mapPlotParams.tooltip.move(event)
                        })
                        .on("mouseout", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", 0);

                            mapPlotParams.tooltip.hide();
                        })
                        .on("click", function(event, d) {
                            uiParameters.updateLinkSelection(d.linkID, d.location, d.location);
                            uiParameters.updateReadFromGaugeLocation(true);
                            drawDistribution();
                            drawHydrographStateVariable();
                            drawHydrographInflation();
                        });
        });
    }
    else {
        d3.select("#gauge-locations-data")
            .selectAll("circle")
            .remove();
    }
}