import { uiParameters } from './uiParameters.js';
import { setupTooltip, wrfHydroStateVariables, captializeFirstLetter, downloadSvg } from './helper.js';
import { drawDistribution } from "./distribution.js";
import { drawHydrographStateVariable, drawHydrographStateVariableV2, drawHydrographInflation } from "./hydrograph.js";

class mapPlotParams {
    static nonConusStates = [
        'Alaska', 'Hawaii', 'Puerto Rico', 'American Samoa', 'Guam', 'Commonwealth of the Northern Mariana Islands', 'United States Virgin Islands'
    ];

    // axes params
    static mapAxesTickLabelFontSize = 10;
    static mapAxesLabelFontSize = 15;
    static mapAxesLabelPadding = 5;
    static mapBorderStrokeWidth = 1;
    
    // margins
    static topMargin = 10;
    static bottomMargin = 50;
    static leftMargin = 75;
    static rightMargin = 10;
    static mapWidth = 0;
    static mapHeight = 0;
    // the padding to be added around the region of interest
    // to position it in the center of the map projection
    // specifed as a percentage of the data bounding box width and height
    static projectionExtentBboxPadding = 20;

    // map visualization download button params
    static buttonLeftX = 0;
    static buttonTopY = this.topMargin;
    static buttonWidth = this.leftMargin * 0.4;
    static buttonHeight = 0;

    static setMapSize(width, height) {
        this.mapWidth = width - this.leftMargin - this.rightMargin;
        this.mapHeight = height - this.topMargin - this.bottomMargin;
        this.legendLeftX = this.leftMargin + this.mapWidth * 0.02;
        this.legendTopY = this.topMargin + this.mapHeight * 0.9;
        this.buttonHeight = this.mapHeight * 0.05;
    }

    static colorInterpolator = d3.interpolateWarm;
    // possible options for color schemes
    // d3.interpolateWarm, d3.interpolateViridis, d3.interpolateCool, d3.interpolatePlasma
    static colorScale = null;
    static setMapColorScale(data) {
        this.colorScale = d3.scaleSequential(this.colorInterpolator)
                                .domain(data.toReversed());
    }

    static getMapColorScale(data) {
        return d3.scaleSequential(this.colorInterpolator)
                .domain(data.toReversed());
    }

    static sizeRange = [0.5, 5];
    static sizeScale = null;
    static setMapSizeScale(data) {
        this.sizeScale = d3.scaleLinear()
                                .domain(data)
                                .range(this.sizeRange);
    }
    
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
                color: this.colorInterpolator((this.legendRectCount-i)/256)
            };
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
        var subTitle = ''
        if (inflation) {
            labelTitle = `${aggregation == 'mean' ? 'Mean' : 'Standard Deviation'} of ${daStage == 'preassim' ? 'Forecast' : captializeFirstLetter(daStage)} for ${inflation == 'priorinf' ? 'Prior' : 'Posterior'} Inflation on ${wrfHydroStateVariables[stateVariable].commonName}`;
        }
        else {
            labelTitle = `${aggregation == 'mean' ? 'Mean' : 'Standard Deviation'} of ${daStage == 'preassim' ? 'Forecast' : captializeFirstLetter(daStage)} for ${wrfHydroStateVariables[stateVariable].commonName}`;
            subTitle = 'in ' + wrfHydroStateVariables[stateVariable].units;
        }

        if (aggregation != 'mean' && aggregation != 'sd') {
            if (inflation) {
                labelTitle = `${daStage == 'preassim' ? 'Forecast' : captializeFirstLetter(daStage)} for ${inflation == 'priorinf' ? 'Prior' : 'Posterior'} Inflation on ${wrfHydroStateVariables[stateVariable].commonName} for Member ${aggregation}`;
            }
            else {
                labelTitle = `${daStage == 'preassim' ? 'Forecast' : captializeFirstLetter(daStage)} for ${wrfHydroStateVariables[stateVariable].commonName} for Member ${aggregation}`;
                subTitle = 'in ' + wrfHydroStateVariables[stateVariable].units;
            }
        }

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
            label: subTitle,
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
        .attr("height", mapPlotParams.topMargin+mapPlotParams.mapHeight+mapPlotParams.bottomMargin)
        .style("fill", "white");

    yRect.append("text")
        .text("LATITUDE")
        .attr("x", -mapPlotParams.topMargin-mapPlotParams.mapHeight/2)
        .attr("y", mapPlotParams.mapAxesLabelPadding)
        .attr("font-size", mapPlotParams.mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "hanging")
        .attr("transform", `rotate(-90)`);

    const xRect = d3.select("#geoMap-svg")
                    .append("g")
                    .attr("id", "xAxis-rect")

    xRect.append("rect")
        .attr("x", 0)
        .attr("y", mapPlotParams.topMargin+mapPlotParams.mapHeight)
        .attr("width", mapPlotParams.leftMargin + mapPlotParams.mapWidth + mapPlotParams.rightMargin)
        .attr("height", mapPlotParams.bottomMargin)
        .style("fill", "white");

    xRect.append("text")
        .text("LONGITUDE")
        .attr("x", mapPlotParams.leftMargin + mapPlotParams.mapWidth/2)
        .attr("y", mapPlotParams.topMargin + mapPlotParams.mapHeight + mapPlotParams.bottomMargin - mapPlotParams.mapAxesLabelPadding)
        .attr("font-size", mapPlotParams.mapAxesLabelFontSize)
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "baseline");

    // top clip rect
    d3.select("#geoMap-svg")
        .append("g")
        .append("rect")
        .attr("x", mapPlotParams.leftMargin)
        .attr("y", 0)
        .attr("width", mapPlotParams.mapWidth + mapPlotParams.rightMargin)
        .attr("height", mapPlotParams.topMargin)
        .style("fill", "white");

    // right clip rect
    d3.select("#geoMap-svg")
        .append("g")
        .append("rect")
        .attr("x", mapPlotParams.leftMargin + mapPlotParams.mapWidth)
        .attr("y", 0)
        .attr("width", mapPlotParams.rightMargin)
        .attr("height", mapPlotParams.topMargin + mapPlotParams.mapHeight)
        .style("fill", "white");

    // latitiude axis
    const yScale = d3.scaleLinear()
                .domain([mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[1], mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin])[1]])
                .interpolate(function(a, b) {
                    return function(t) {
                        // denormalize t to get the actual lat value being queried for
                        var lat1 = mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[1];
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
                .domain([mapPlotParams.projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[0], mapPlotParams.projection.invert([mapPlotParams.leftMargin+mapPlotParams.mapWidth, mapPlotParams.topMargin+mapPlotParams.mapHeight])[0]])
                .range([mapPlotParams.leftMargin, mapPlotParams.leftMargin+mapPlotParams.mapWidth]);
//                 .interpolate(function(a, b) {
//                     return function(t) {
//                         // denormalize t to get the actual lon value being queried for
//                         var lon1 = projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[0];
//                         var lat = projection.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[1];
//                         var lonn = projection.invert([mapPlotParams.mapWidth-mapPlotParams.rightMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight])[0];
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
                .attr("transform", `translate(0, ${mapPlotParams.topMargin+mapPlotParams.mapHeight})`)
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

    const mapDivWidth = Math.floor(document.getElementById('geoMap-div').clientWidth);
    const mapDivHeight = Math.floor(document.getElementById('geoMap-div').clientHeight);

    mapPlotParams.setMapSize(mapDivWidth, mapDivHeight);

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
                        .rotate([-dataCentroid.lon, 0, 0])
                        .fitExtent([
                            [mapPlotParams.leftMargin, mapPlotParams.topMargin], 
                            [mapPlotParams.leftMargin+mapPlotParams.mapWidth, mapPlotParams.topMargin+mapPlotParams.mapHeight]
                        ], projectionExtentBBox);

    var path = d3.geoPath().projection(projection);

    mapPlotParams.setProjectionAndPath(projection, path);

    // base svg
    var svgMap = d3.select("#geoMap-div")
                    .append("svg")
                    .attr("id", "geoMap-svg")
                    .style("background-color", "#fff")
                    .attr("width", mapPlotParams.leftMargin+mapPlotParams.mapWidth+mapPlotParams.rightMargin)
                    .attr("height", mapPlotParams.topMargin+mapPlotParams.mapHeight+mapPlotParams.bottomMargin)
                    .attr("viewBox", [0, 0, mapPlotParams.leftMargin+mapPlotParams.mapWidth+mapPlotParams.rightMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight+mapPlotParams.bottomMargin])
                    .append("g")
                    .attr("id", "geo-zoom");

    var zoom = d3.zoom()
                // .filter(function(event) {
                //     return !event.shiftKey;
                // })
                .extent([
                    [mapPlotParams.leftMargin, mapPlotParams.topMargin], 
                    [mapPlotParams.leftMargin+mapPlotParams.mapWidth, mapPlotParams.topMargin+mapPlotParams.mapHeight]
                ])
                .scaleExtent([1,8])
                .translateExtent([
                    [mapPlotParams.leftMargin, mapPlotParams.topMargin],
                    [mapPlotParams.leftMargin+mapPlotParams.mapWidth, mapPlotParams.topMargin+mapPlotParams.mapHeight]
                ])
                .on("zoom", zoomed);

    svgMap.call(zoom);

    // dummy rect to support pan-zoom actions anywhere in the viewport
    svgMap.append("g")
        .append("rect")
        .attr("x", mapPlotParams.leftMargin)
        .attr("y", mapPlotParams.topMargin)
        .attr("width", mapPlotParams.mapWidth)
        .attr("height", mapPlotParams.mapHeight)
        .attr("stroke-width", 0)
        .style("fill", "#d0edff");  // blue for sea
    
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

        axes.gY.call(axes.yAxis.scale(axes.yScale.copy().domain([projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight]))[1], projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin]))[1]])))
                .call(g => g.select(".domain").remove());

        d3.selectAll("#lon-axis>.tick>text")
            .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);

        axes.gX.call(axes.xAxis.scale(axes.xScale.copy().domain([projection.invert(event.transform.invert([mapPlotParams.leftMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight]))[0], projection.invert(event.transform.invert([mapPlotParams.leftMargin+mapPlotParams.mapWidth, mapPlotParams.topMargin+mapPlotParams.mapHeight]))[0]])))
            .call(g => g.select(".domain").remove());

        d3.selectAll("#lat-axis>.tick>text")
            .style("font-size", mapPlotParams.mapAxesTickLabelFontSize);
    }

    const tooltip = setupTooltip(mapPlotParams.leftMargin+mapPlotParams.mapWidth+mapPlotParams.rightMargin, mapPlotParams.topMargin+mapPlotParams.mapHeight+mapPlotParams.bottomMargin);
    mapPlotParams.setTooltip(tooltip);

    // legend
    d3.select("#geoMap-svg")
        .append("g")
        .attr("id", "mapLegend")
        .attr("transform", `translate(${mapPlotParams.legendLeftX}, ${mapPlotParams.legendTopY})`)
        .selectAll("rect")
        .data(mapPlotParams.generateLegendRects(), d => d.color)
        .enter()
            .append("rect")
            .attr("x", function(d) {    return d.x; })
            .attr("y", function(d) {    return d.y; })
            .attr("width", function(d) {    return d.width; })
            .attr("height", function(d) {    return d.height; })
            .style("stroke-width", 0)
            .style("fill", function(d) {    return d.color; })
            .style("opcaity", 1);

    // map border
    d3.select("#geoMap-svg")
        .append("g")
        .attr("id", "mapBorder")
        .attr("transform", `translate(${mapPlotParams.leftMargin}, ${mapPlotParams.topMargin})`)
        .append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", mapPlotParams.mapWidth)
            .attr("height", mapPlotParams.mapHeight)
            .attr("fill", "none")
            .attr("stroke-width", mapPlotParams.mapBorderStrokeWidth)
            .attr("stroke", "black")
            .attr("pointer-events", "none");    // to enable hover, zoom and pan on the map region

    // download button
    d3.select("#yAxis-rect")
        .append("g")
        .attr("id", "download-button")
        .attr("class", "download-button")
        .append("image")
        .attr("x", mapPlotParams.buttonLeftX)
        .attr("y", mapPlotParams.buttonTopY)
        .attr("width", mapPlotParams.buttonWidth)
        .attr("height", mapPlotParams.buttonHeight)
        .attr("xlink:href", "static/download.png")
        .on("click", function() {
            downloadSvg("geoMap-svg");
        });
}

export async function drawLinkData() {
    await d3.json('/getRouteLinkData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        console.log(data)

        d3.select("#wrf-hydro-data")
        .selectAll("path")
        .data(data, d => d.linkID)
        .join(
            function enter(enter) {
                enter.append("path")
                    .attr("d", function(d) {    return mapPlotParams.path(d.line); })
                    .attr("stroke-width", 1)
                    .attr("stroke", "black")
                    .style("fill", "None")
                    .attr("coordinates", function(d) {
                        return d.line.coordinates;
                    });
            }
        )
    });
}

export async function drawMapData() {
    const stateVariable = uiParameters.stateVariable;
    const aggregation = uiParameters.aggregation;
    const daStage = uiParameters.daStage;
    const inflation = uiParameters.inflation;
    const timestamp = uiParameters.timestamp;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data

    d3.json('/getMapData',
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
        // console.log(wrf_hydro_data);

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
                            if (d.linkID == 1666)
                                return "black";
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

export async function drawMapDataV2() {
    const stateVariable = uiParameters.stateVariable;
    const aggregation = uiParameters.aggregation;
    const daStage = uiParameters.daStage;
    const inflation = uiParameters.inflation;
    const timestamp = uiParameters.timestamp;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data

    d3.json('/getMapData',
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
        // console.log(wrf_hydro_data);

        mapPlotParams.setMapColorScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));
        mapPlotParams.setMapSizeScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));

        d3.select("#wrf-hydro-data")
            .selectAll("path")
            .data(wrf_hydro_data, d => d.linkID)
            .join(
                function enter(enter) {},
                function update(update) {
                    update.attr("stroke-width", function(d) {
                            return mapPlotParams.sizeScale(d[stateVariable]);
                        })
                        .attr("stroke", function(d) {
                            return mapPlotParams.colorScale(d[stateVariable]);
                        })
                        .on("mouseover", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", 2 * mapPlotParams.sizeScale(d[stateVariable]));
                            
                                var coords = d3.select(this)
                                                .attr("coordinates");
                                d.coordinates = coords.split(',').map(x => parseFloat(x));

                                mapPlotParams.tooltip.display(d);
                        })
                        .on("mousemove", function(event, d) {
                            mapPlotParams.tooltip.move(event)
                        })
                        .on("mouseout", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("stroke-width", mapPlotParams.sizeScale(d[stateVariable]));
                                
                            mapPlotParams.tooltip.hide();
                        })
                        .on("click", function(event, d) {
                            var coords = d3.select(this)
                                            .attr("coordinates");
                            d.coordinates = coords.split(',').map(x => parseFloat(x));

                            uiParameters.updateLinkSelection(d.linkID, d.coordinates.slice(0,2), d.coordinates.slice(2,4));
                            uiParameters.updateReadFromGaugeLocation(false);
                            drawDistribution();
                            drawHydrographStateVariableV2();
                            drawHydrographInflation();
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
            // console.log(data);

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
                        .style("fill", "#e31a1c")
                        .style("opacity", 0.5)
                        .on("mouseover", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("r", 3);
                            
                                mapPlotParams.tooltip.display(d);
                        })
                        .on("mousemove", function(event, d) {
                            mapPlotParams.tooltip.move(event)
                        })
                        .on("mouseout", function(event, d) {
                            d3.select(this)
                                .transition()
                                .duration(100)
                                .attr("r", 2);

                            mapPlotParams.tooltip.hide();
                        })
                        .on("click", function(event, d) {
                            uiParameters.updateLinkSelection(d.gaugeID, d.location, d.location);
                            uiParameters.updateReadFromGaugeLocation(true);
                            drawDistribution();
                            drawHydrographStateVariableV2();
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