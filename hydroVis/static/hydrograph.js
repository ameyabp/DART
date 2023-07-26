import { getJSDateObjectFromTimestamp, wrfHydroStateVariables } from "./helper.js";
import { uiParameters } from "./uiParameters.js";

class hydrographPlotParams {
    static leftMargin = 50;
    static bottomMargin = 40;
    static topMargin = 20;
    static rightMargin = 10;
    
    static divWidth = 0;
    static divHeight = 0;

    static plotWidth = 0;
    static plotHeight = 0;

    static axesLabelFontSize = 15;
    static axesTickLabelFontSize = 10;

    static xScale = null;
    static yAxis = null;

    static strokeWidth = 2;

    static legendRectWidth = 0;
    static legendRectHeight = 0;
    
    static setDivWidth(width) {
        this.divWidth = width;
        this.plotWidth = this.divWidth - this.leftMargin - this.rightMargin;
        this.legendRectWidth = this.plotWidth * 0.05;
        this.legendLeftX = this.plotWidth * 0.8
    }

    static setDivHeight(height) {
        this.divHeight = height;
        this.plotHeight = this.divHeight - this.topMargin - this.bottomMargin;
        this.legendRectHeight = this.plotHeight * 0.05;
    }

    static setHorizontalScale(scale) {
        this.xScale = scale;
    }

    static setVerticalAxis(axis) {
        this.yAxis = axis;
    }

    static legend = [
        {
            daStage: 'Analysis',
            color: '#1f78b4'    // blue
        },
        {
            daStage: 'Forecast',
            color: '#33a02c'    // green
        },
        {
            daStage: 'Observations',
            color: '#e31a1c'    // red
        }
    ]

    static legendVerticalPadding = 5;
    static legendHorizontalPadding = 5;
    static legendRectWidth = 0;
    static legendRectHeight = 0;
    static legendLabelFontSize = 10;
    static legendLeftX = 0;
}

function setupHydrographPlot(id, timestamps) {
    var hydrographSvg = d3.select(`#${id}-div`)
                            .append("svg")
                            .attr("width", "100%")
                            .attr("height", "100%")
                            .attr("id", `${id}-svg`);

    // setup y axis
    hydrographSvg.append("g")
                .attr("id", `${id}-yAxis`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.topMargin})`)

    var yScale = d3.scaleLinear()
                .domain([0, 1])
                .range([hydrographPlotParams.plotHeight, 0])
                .nice();

    var yAxis = d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format(".4"));

    d3.select(`#${id}-yAxis`).call(yAxis);

    hydrographPlotParams.setVerticalAxis(yAxis);

    // setup x axis
    hydrographSvg.append("g")
                .attr("id", `${id}-xAxis`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.divHeight - hydrographPlotParams.bottomMargin})`);

    hydrographSvg.append("text")
                .text("Time")
                .attr("x", hydrographPlotParams.leftMargin + (hydrographPlotParams.divWidth-hydrographPlotParams.leftMargin-hydrographPlotParams.rightMargin)/2)
                .attr("y", hydrographPlotParams.divHeight-5)
                .attr("font-size", hydrographPlotParams.axesLabelFontSize)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "baseline");

    var xScale = d3.scaleTime()
                .domain(d3.extent(timestamps))
                .range([0, hydrographPlotParams.plotWidth])
                .nice();

    var xAxis = d3.axisBottom(xScale)
                .ticks(5);

    d3.select(`#${id}-xAxis`).call(xAxis);

    hydrographPlotParams.setHorizontalScale(xScale);

    // setup plot area
    hydrographSvg.append("g")
                .attr("id", `${id}-plot`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.topMargin})`)
                // clip path
                .append("clipPath")
                .attr("id", `${id}-clip`)
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", hydrographPlotParams.plotWidth)
                .attr("height", hydrographPlotParams.plotHeight);

    // gridlines
    hydrographSvg.select(`#${id}-plot`)
                .append("g")
                .attr("id", `${id}-gridlines`)
                .attr("clip-path", `url(#${id}-clip)`)
                .selectAll("line")
                .data(yScale.ticks(), d => d)
                .enter()
                    .append("line")
                    .attr("x1", 0)
                    .attr("x2", hydrographPlotParams.plotWidth)
                    .attr("y1", d => yScale(d))
                    .attr("y2", d => yScale(d))
                    .style("stroke", "grey")
                    .style("opacity", 0.2);

    // data area
    hydrographSvg.select(`#${id}-plot`)
                .append("g")
                .attr("id", `${id}-forecast-data`);

    hydrographSvg.select(`#${id}-plot`)
                .append("g")
                .attr("id", `${id}-analysis-data`);

    hydrographSvg.select(`#${id}-plot`)
                .append("g")
                .attr("id", `${id}-observation-data`);

    // legend
    hydrographSvg.select(`#${id}-plot`)
                .append("g")
                .attr("id", `${id}-legend`);

    d3.select(`#${id}-legend`)
        .selectAll("rect")
        .data(id === 'hydrographInf' ? hydrographPlotParams.legend.slice(0,2) : hydrographPlotParams.legend)
        .enter()
            .append("rect")
            .attr("x", hydrographPlotParams.legendLeftX)
            .attr("y", function(d, i) {
                return (hydrographPlotParams.legendRectHeight + hydrographPlotParams.legendVerticalPadding) * i + hydrographPlotParams.legendVerticalPadding;
            })
            .attr("width", hydrographPlotParams.legendRectWidth)
            .attr("height", hydrographPlotParams.legendRectHeight)
            .style("stroke-width", 0)
            .style("fill", function(d) {    return d.color; })
            .style("opacity", 0.5);

    d3.select(`#${id}-legend`)
        .selectAll("text")
        .data(id === 'hydrographInf' ? hydrographPlotParams.legend.slice(0,2) : hydrographPlotParams.legend)
        .enter()
            .append("text")
            .text(function(d) { return d.daStage;   })
            .attr("font-size", hydrographPlotParams.legendLabelFontSize)
            .attr("x", hydrographPlotParams.legendLeftX + hydrographPlotParams.legendRectWidth + hydrographPlotParams.legendHorizontalPadding)
            .attr("y", function(d, i) {
                return (hydrographPlotParams.legendRectHeight + hydrographPlotParams.legendVerticalPadding) * i + hydrographPlotParams.legendVerticalPadding;
            })
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "hanging");

    // setup details text panel
    hydrographSvg.append("text")
                .attr("id", `${id}-text`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, 0)`)
                .attr("text-anchor", "start")
                .attr("alignment-baseline", "hanging")
                .text(function() {
                    return id === 'hydrographSV' ? "Hydrograph for state variable" : "Hydrograph for mean inflation"
                })
}

export async function setupHydrographPlots() {
    d3.json('/getTimestamps', {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(timestamps) {
        timestamps = timestamps.map(getJSDateObjectFromTimestamp);

        // both hydrographSV-div and hydrographInf-div have the same dimensions
        hydrographPlotParams.setDivHeight(document.getElementById("hydrographSV-div").clientHeight);
        hydrographPlotParams.setDivWidth(document.getElementById("hydrographSV-div").clientWidth * 0.95);

        setupHydrographPlot('hydrographSV', timestamps);
        setupHydrographPlot('hydrographInf', timestamps);
    });
}

export async function drawHydrographStateVariable() {
    const stateVariable = uiParameters.stateVariable;
    const aggregation = uiParameters.aggregation;
    const linkID = uiParameters.linkID;
    const readFromGaugeLocation = uiParameters.readFromGaugeLocation;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data
    if (!linkID)
        return;

    d3.json('/getHydrographStateVariableData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            linkID: linkID,
            stateVariable: stateVariable,
            aggregation: aggregation,
            readFromGaugeLocation: readFromGaugeLocation
        })
    }).then(function(data) {
        console.log(data);

        // recompute and rerender Y axis
        var yScale = null;
        if (readFromGaugeLocation && stateVariable === 'qlink1' && aggregation !== 'sd') {
            yScale = d3.scaleLinear()
                        .domain([
                            d3.min(data.data, d => Math.min(d.forecastSdMin, d.analysisSdMin, d.forecast, d.analysis, d.observation)), 
                            d3.max(data.data, d => Math.max(d.forecastSdMax, d.analysisSdMax, d.forecast, d.analysis, d.observation))
                        ])
                        .range([hydrographPlotParams.plotHeight, 0])
                        .nice();
        }
        else {
            yScale = d3.scaleLinear()
                        .domain([
                            d3.min(data.data, d => Math.min(d.forecastSdMin, d.analysisSdMin, d.forecast, d.analysis)), 
                            d3.max(data.data, d => Math.max(d.forecastSdMax, d.analysisSdMax, d.forecast, d.analysis))
                        ])
                        .range([hydrographPlotParams.plotHeight, 0])
                        .nice();
        }

        d3.select('#hydrographSV-yAxis').call(hydrographPlotParams.yAxis.scale(yScale));

        // recompute and rerender horizontal gridlines
        d3.select('#hydrographSV-gridlines')
            .selectAll("line")
            .data(yScale.ticks(), d => d)
            .join(
                function enter(enter) {
                    enter.append("line")
                        .attr("x1", 0)
                        .attr("x2", hydrographPlotParams.plotWidth)
                        .attr("y1", d => yScale(d))
                        .attr("y2", d => yScale(d))
                        .style("stroke", "grey")
                        .style("opacity", 0.2);
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("x1", 0)
                        .attr("x2", hydrographPlotParams.plotWidth)
                        .attr("y1", d => yScale(d))
                        .attr("y2", d => yScale(d))
                }
            )

        // render forecast data
        d3.select('#hydrographSV-forecast-data')
            .selectAll("#dataPath")
            .data([data.data])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .attr("id", "dataPath")
                        .style("fill", "none")
                        .style("stroke", "#33a02c")
                        .style("stroke-width", hydrographPlotParams.strokeWidth)
                        .style("opacity", 0.5)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.forecast);  })
                        );
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.forecast);   })
                        );
                }
            )

            d3.select('#hydrographSV-forecast-data')
                .selectAll("#sdPath")
                .data([data.data])
                .join(
                    function enter(enter) {
                        enter.append("path")
                            .attr("id", "sdPath")
                            .style("fill", "#33a02c")
                            .style("stroke", "#33a02c")
                            .style("stroke-width", 0)
                            .style("opacity", 0.2)
                            .attr("d", d3.area()
                                        .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                        .y0(function(d) {    return yScale(d.forecastSdMin);  })
                                        .y1(function(d) {    return yScale(d.forecastSdMax);  })
                            );
                    },
                    function update(update) {
                        update.transition()
                            .duration(200)
                            .attr("d", d3.area()
                                        .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                        .y0(function(d) {    return yScale(d.forecastSdMin);  })
                                        .y1(function(d) {    return yScale(d.forecastSdMax);  })
                            );
                    }
                )

        // render analysis data
        d3.select('#hydrographSV-analysis-data')
            .selectAll("#dataPath")
            .data([data.data])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .attr("id", "dataPath")
                        .style("fill", "none")
                        .style("stroke", "#1f78b4")
                        .style("stroke-width", hydrographPlotParams.strokeWidth)
                        .style("opacity", 0.5)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.analysis);  })
                        );
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.analysis);   })
                        );
                }
            )

        d3.select('#hydrographSV-analysis-data')
            .selectAll("#sdPath")
            .data([data.data])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .attr("id", "sdPath")
                        .style("fill", "#1f78b4")
                        .style("stroke", "#1f78b4")
                        .style("stroke-width", 0)
                        .style("opacity", 0.2)
                        .attr("d", d3.area()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y0(function(d) {    return yScale(d.analysisSdMin);  })
                                    .y1(function(d) {    return yScale(d.analysisSdMax);  })
                        );
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("d", d3.area()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y0(function(d) {    return yScale(d.analysisSdMin);  })
                                    .y1(function(d) {    return yScale(d.analysisSdMax);  })
                        );
                }
            )

        if (readFromGaugeLocation && stateVariable === 'qlink1' && aggregation !== 'sd') {
            d3.select('#hydrographSV-observation-data')
                .selectAll("path")
                .data(data.data)
                .join(
                    function enter(enter) {
                        enter.append("path")
                            .style("stroke", "#e31a1c")
                            .style("stroke-width", hydrographPlotParams.strokeWidth)
                            .style("opacity", 0.5)
                            .attr("d", d3.symbol().size(16).type(d3.symbolTimes))
                            .attr("transform", function(d) {
                                return `translate(
                                    ${hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp))} ,
                                    ${yScale(d.observation)}
                                )`;
                            });
                    },
                    function update(update) {
                        update.transition()
                            .duration(200)
                            .attr("d", d3.symbol().size(16).type(d3.symbolTimes))
                            .attr("transform", function(d) {
                                return `translate(
                                    ${hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp))} ,
                                    ${yScale(d.observation)}
                                )`;
                            });
                    }
                )
        }
        else {
            d3.select("#hydrographSV-observation-data")
                .selectAll("path")
                .remove();
        }

        // render textual information
        d3.select('#hydrographSV-text')
            .text(function() {
                if (aggregation == 'mean')
                    return `Hydrograph for mean ${wrfHydroStateVariables[stateVariable].commonName} (${wrfHydroStateVariables[stateVariable].units})`;
                else if (aggregation == 'sd')
                    return `Hydrograph for standard deviation of ${wrfHydroStateVariables[stateVariable].commonName} (${wrfHydroStateVariables[stateVariable].units})`;
                else
                    return `Hydrograph of ${wrfHydroStateVariables[stateVariable].commonName} (${wrfHydroStateVariables[stateVariable].units}) for ensemble member ${aggregation}`;
            })
    });
}

export async function drawHydrographInflation() {
    const stateVariable = uiParameters.stateVariable;
    const linkID = uiParameters.linkID;
    const inflation = uiParameters.inflation;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data

    if (!inflation) {
        d3.select('#hydrographInf-forecast-data')
            .selectAll("path")
            .remove();

        d3.select('#hydrographInf-analysis-data')
            .selectAll("path")
            .remove();

        d3.select('#hydrographInf-text')
            .text(function() {
                return `Hydrograph for inflation`
            })

        return;
    }

    d3.json('/getHydrographInflationData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            linkID: linkID,
            stateVariable: stateVariable,
            inflation: inflation
        })
    }).then(function(data) {
        console.log(data);

        // recompute and rerender Y axis
        var yScale = d3.scaleLinear()
                        .domain([d3.min(data.data, d => Math.min(d.forecast, d.analysis)), d3.max(data.data, d => Math.max(d.forecast, d.analysis))])
                        .range([hydrographPlotParams.plotHeight, 0])
                        .nice();

        d3.select('#hydrographInf-yAxis').call(hydrographPlotParams.yAxis.scale(yScale));

        // recompute and rerender horizontal gridlines
        d3.select('#hydrographInf-gridlines')
            .selectAll("line")
            .data(yScale.ticks(), d => d)
            .join(
                function enter(enter) {
                    enter.append("line")
                        .attr("x1", 0)
                        .attr("x2", hydrographPlotParams.plotWidth)
                        .attr("y1", d => yScale(d))
                        .attr("y2", d => yScale(d))
                        .style("stroke", "grey")
                        .style("opacity", 0.2);
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("x1", 0)
                        .attr("x2", hydrographPlotParams.plotWidth)
                        .attr("y1", d => yScale(d))
                        .attr("y2", d => yScale(d))
                }
            )

        // render data
        d3.select('#hydrographInf-forecast-data')
            .selectAll("path")
            .data([data.data])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .style("fill", "none")
                        .style("stroke", "#33a02c")
                        .style("stroke-width", hydrographPlotParams.strokeWidth)
                        .style("opacity", 0.5)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.forecast);  })
                        );
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.forecast)   })
                        );
                }
            )

        d3.select('#hydrographInf-analysis-data')
            .selectAll("path")
            .data([data.data])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .style("fill", "none")
                        .style("stroke", "#1f78b4")
                        .style("stroke-width", hydrographPlotParams.strokeWidth)
                        .style("opacity", 0.5)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.analysis);  })
                        );
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("d", d3.line()
                                    .x(function(d) {    return hydrographPlotParams.xScale(getJSDateObjectFromTimestamp(d.timestamp));   })
                                    .y(function(d) {    return yScale(d.analysis)   })
                        );
                }
            )

        // render textual information
        d3.select('#hydrographInf-text')
            .text(function() {
                return `Hydrograph for mean ${inflation == 'priorinf' ? 'prior' : 'posterior'} distribution inflation for ${wrfHydroStateVariables[stateVariable].commonName}`
            })
    });
}