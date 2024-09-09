import { wrfHydroStateVariables, downloadSvg } from "./helper.js";
import { uiParameters } from "./uiParameters.js";

class distributionPlotParams {
    static leftMargin = 40;
    static bottomMargin = 40;
    static topMargin = 20;
    static rightMargin = 40;

    static divWidth = 0;
    static divHeight = 0;

    static plotWidth = 0;
    static plotHeight = 0;

    static axesLabelFontSize = 15;
    static axesTickLabelFontSize = 10;
    static axesLabelPadding = 5;
    static chartTitlePadding = 5;

    static yScale = null;
    static yAxis = null;

    static xScale = null;
    static xAxis = null;

    // distribution plot download button params
    static buttonTopY = 0;
    static buttonLeftX = 0;
    static buttonWidth = this.leftMargin * 0.6;
    static buttonHeight = this.topMargin * 0.95;

    static setDivWidth(width) {
        this.divWidth = width;
        this.plotWidth = this.divWidth - this.leftMargin - this.rightMargin;
        this.legendRectWidth = this.plotWidth * 0.05;
        this.legendLeftX = this.plotWidth * 0.8;
    }

    static setDivHeight(height) {
        this.divHeight = height;
        this.plotHeight = this.divHeight - this.topMargin - this.bottomMargin;
        this.legendRectHeight = this.plotHeight * 0.05;
    }

    static setVerticalAxis(scale, axis) {
        this.yScale = scale;
        this.yAxis = axis;
    }

    static setHorizontalAxis(axis) {
        this.xAxis = axis;
    }

    static legend = [
        {
            daStage: 'Analysis',
            color: '#1f78b4'    // blue
        },
        {
            daStage: 'Forecast',
            color: '#33a02c'    // green
        }
    ]

    static legendVerticalPadding = 5;
    static legendHorizontalPadding = 5;
    static legendRectWidth = 0;
    static legendRectHeight = 0;
    static legendLabelFontSize = 10;
    static legendLeftX = 0;
}

export function setupDistributionPlot() {
    distributionPlotParams.setDivHeight(document.getElementById("distribution-div").clientHeight);
    distributionPlotParams.setDivWidth(document.getElementById("distribution-div").clientWidth);

    var distributionSvg = d3.select(`#distribution-div`)
                            .append("svg")
                            .attr("width", "100%")
                            .attr("height", "100%")
                            .attr("id", `distribution-svg`)
                            .style("background-color", "#fff");

    // setup y axis
    distributionSvg.append("g")
                    .attr("id", `distribution-yAxis`)
                    .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.topMargin})`);

    // distributionSvg.append("text")
    //                 .attr("id", `distribution-yAxis-label`)
    //                 .text("Distribution")
    //                 .attr("x", -distributionPlotParams.topMargin-(distributionPlotParams.divHeight-distributionPlotParams.topMargin-distributionPlotParams.bottomMargin)/2)
    //                 .attr("y", 0)
    //                 .attr("font-size", distributionPlotParams.axesLabelFontSize)
    //                 .attr("text-anchor", "middle")
    //                 .attr("alignment-baseline", "hanging")
    //                 .attr("transform", `rotate(-90)`);
    
    var yScale = d3.scaleLinear()
                    .domain([0, 1])
                    .range([distributionPlotParams.plotHeight, 0])
                    .nice();
    
    var yAxis = d3.axisLeft(yScale)
                .ticks(5)
                .tickFormat(d3.format(".4"));

    d3.select(`#distribution-yAxis`).call(yAxis);

    distributionPlotParams.setVerticalAxis(yScale, yAxis);

    // setup x axis
    distributionSvg.append("g")
                .attr("id", `distribution-xAxis`)
                .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.divHeight - distributionPlotParams.bottomMargin})`);

    distributionSvg.append("text")
                .text("Ensemble Model Outputs")
                .attr("x", distributionPlotParams.leftMargin + (distributionPlotParams.divWidth-distributionPlotParams.leftMargin-distributionPlotParams.rightMargin)/2)
                .attr("y", distributionPlotParams.divHeight-distributionPlotParams.axesLabelPadding)
                .attr("font-size", distributionPlotParams.axesLabelFontSize)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "baseline");

    var xScale = d3.scaleLinear()
                    .domain([0, 1])
                    .range([0, distributionPlotParams.plotWidth])
                    .nice();

    var xAxis = d3.axisBottom(xScale)
                .ticks(5)
                .tickFormat(d3.format(".4"));

    d3.select(`#distribution-xAxis`)
        .call(xAxis);

    distributionPlotParams.setHorizontalAxis(xAxis);

    // setup plot area
    distributionSvg.append("g")
                    .attr("id", `distribution-plot`)
                    .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.topMargin})`)
    // clip path
                    .append("clipPath")
                    .attr("id", `distribution-clip`)
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", distributionPlotParams.plotWidth)
                    .attr("height", distributionPlotParams.plotHeight);

    // gridlines
    distributionSvg.select(`#distribution-plot`)
                    .append("g")
                    .attr("id", `distribution-gridlines`)
                    .attr("clip-path", `url(#distribution-clip)`)
                    .selectAll("line")
                    .data(yScale.ticks(), d => d)
                    .enter()
                        .append("line")
                        .attr("x1", 0)
                        .attr("x2", distributionPlotParams.plotWidth)
                        .attr("y1", d => yScale(d))
                        .attr("y2", d => yScale(d))
                        .style("stroke", "grey")
                        .style("opacity", 0.2)

    // data area
    distributionSvg.select(`#distribution-plot`)
                    .append("g")
                    .attr("id", `distribution-analysis-data`);

    distributionSvg.select(`#distribution-plot`)
                    .append("g")
                    .attr("id", `distribution-forecast-data`);

    // legend
    distributionSvg.select(`#distribution-plot`)
                    .append("g")
                    .attr("id", `distribution-legend`)
                    
    d3.select(`#distribution-legend`)
        .selectAll("rect")
        .data(distributionPlotParams.legend)
        .enter()
            .append("rect")
            .attr("x", distributionPlotParams.legendLeftX)
            .attr("y", function(d, i) {
                return (distributionPlotParams.legendRectHeight + distributionPlotParams.legendVerticalPadding) * i + distributionPlotParams.legendVerticalPadding;
            })
            .attr("width", distributionPlotParams.legendRectWidth)
            .attr("height", distributionPlotParams.legendRectHeight)
            .style("stroke-width", 0)
            .style("fill", function(d) {    return d.color; })
            .style("opacity", 0.5);

    d3.select(`#distribution-legend`)
        .selectAll("text")
        .data(distributionPlotParams.legend)
        .enter()
            .append("text")
            .text(function(d) { return d.daStage;   })
            .attr("font-size", distributionPlotParams.legendLabelFontSize)
            .attr("x", distributionPlotParams.legendLeftX + distributionPlotParams.legendRectWidth + distributionPlotParams.legendHorizontalPadding)
            .attr("y", function(d, i) {
                return (distributionPlotParams.legendRectHeight + distributionPlotParams.legendVerticalPadding) * i + distributionPlotParams.legendVerticalPadding;
            })
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "hanging");

    // setup details text panel
    distributionSvg.append("text")
                    .attr("id", `distribution-text`)
                    .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.chartTitlePadding})`)
                    .attr("text-anchor", "start")
                    .attr("alignment-baseline", "hanging")
                    .text("Distribution of model outputs")

    // zoom
    // var zoom = d3.zoom()
    //             .scaleExtent([1,6])
    //             .extent([[0, 0], [distributionPlotParams.plotWidth, distributionPlotParams.plotHeight]])
    //             .translateExtent([[0, 0], [distributionPlotParams.plotWidth, distributionPlotParams.plotHeight]])
    //             .on("zoom", function(event) {
    //                 zoomDistributionPlot(event, id);
    //             })

    // distributionSvg.call(zoom);
    
    // download button
    d3.select("#distribution-svg")
        .append("g")
        .attr("id", "download-button")
        .attr("class", "download-button")
        .append("image")
        .attr("x", distributionPlotParams.buttonLeftX)
        .attr("y", distributionPlotParams.buttonTopY)
        .attr("width", distributionPlotParams.buttonWidth)
        .attr("height", distributionPlotParams.buttonHeight)
        .attr("xlink:href", "static/download.png")
        .on("click", function() {
            downloadSvg("distribution-svg", distributionPlotParams.divWidth, distributionPlotParams.divHeight);
        });
}

function zoomDistributionPlot(event, plotID) {
    const divIdPrefix = `distribution${plotID}`
    var yScale = event.transform.rescaleY(distributionPlotParams.yScale);

    // render zoomed vertical axis
    d3.select(`#distribution-yAxis`)
        .call(distributionPlotParams.yAxis.scale(yScale));

    // render zoomed gridlines
    d3.select(`#distribution-gridlines`)
        .selectAll("line")
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))

    // render zoomed data
    d3.select(`#distribution-analysis-data`)
        .selectAll("path")
        .attr("d", d3.area()
            .x(function(d) {    return distributionPlotParams.xScale[plotID](d[0]);    })
            .y0(yScale(0))
            .y1(function(d) {   return yScale(d[1]);    }
        )
    );

    d3.select(`#distribution-forecast-data`)
        .selectAll("path")
        .attr("d", d3.area()
            .x(function(d) {    return distributionPlotParams.xScale[plotID](d[0]);    })
            .y0(yScale(0))
            .y1(function(d) {   return yScale(d[1]);    }
        )
    );
}

export async function drawDistribution() {
    const stateVariable = uiParameters.stateVariable;
    const timestamp = uiParameters.timestamp;
    const linkID = uiParameters.linkID;

    // TODO: check if new data really needs to be fetched, 
    // or can we simply used already fetched data

    d3.json('/getDistributionData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
                stateVariable: stateVariable,
                timestamp: timestamp,
                linkID: linkID
            })
    }).then(function(data) {
        // console.log(data);

        // recompute and rerender X axis
        var xScale = d3.scaleLinear()
                        // netcdf file access
                        .domain([
                            d3.min(data.ensembleData, d => Math.min(d[stateVariable]['analysis'], d[stateVariable]['forecast'])),// * 0.9, // extend the min and max value to handle
                            d3.max(data.ensembleData, d => Math.max(d[stateVariable]['analysis'], d[stateVariable]['forecast']))// * 1.1  // the case where all values fall in the same bin
                        ])
                        // xarray access
                        // .domain([
                        //     d3.min(data, d => Math.min(d[stateVariable]['analysis'], d[stateVariable]['forecast'])),// * 0.9, // extend the min and max value to handle
                        //     d3.max(data, d => Math.max(d[stateVariable]['analysis'], d[stateVariable]['forecast']))// * 1.1  // the case where all values fall in the same bin
                        // ])
                        .range([0, distributionPlotParams.plotWidth])
                        .nice();

        d3.select(`#distribution-xAxis`)
            .call(distributionPlotParams.xAxis.scale(xScale));

        // netcdf file access
        const analysisBins = d3.histogram().domain(xScale.domain()).thresholds(xScale.ticks(50))(data.ensembleData.map(d => d[stateVariable]['analysis']));
        const forecastBins = d3.histogram().domain(xScale.domain()).thresholds(xScale.ticks(50))(data.ensembleData.map(d => d[stateVariable]['forecast']));

        // const analysisDensity = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(80))(data.ensembleData.map(d => d[stateVariable]['analysis']));
        // const forecastDensity = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(80))(data.ensembleData.map(d => d[stateVariable]['forecast']));

        // xarray access
        // const analysisBins = d3.histogram().domain(xScale.domain()).thresholds(xScale.ticks(50))(data.map(d => d[stateVariable]['analysis']));
        // const forecastBins = d3.histogram().domain(xScale.domain()).thresholds(xScale.ticks(50))(data.map(d => d[stateVariable]['forecast']));


        // console.log(analysisBins);
        // console.log(forecastBins);
        const distributionSvg = d3.select(`#distribution-svg`);

        // recompute and rerender Y axis
        var yScale = d3.scaleLinear()
                .domain([0, d3.max(analysisBins.concat(forecastBins), d => d.length)])
                .range([distributionPlotParams.plotHeight, 0])
                .nice();

        d3.select(`#distribution-yAxis`)
            .call(distributionPlotParams.yAxis.scale(yScale));

        // recompute and rerender horizontal gridlines
        distributionSvg.select(`#distribution-gridlines`)
                    .selectAll("line")
                    .data(yScale.ticks(), d => d)
                    .join(
                        function enter(enter) {
                            enter.append("line")
                                .attr("x1", 0)
                                .attr("x2", distributionPlotParams.plotWidth)
                                .attr("y1", d => yScale(d))
                                .attr("y2", d => yScale(d))
                                .style("stroke", "grey")
                                .style("opacity", 0.2)
                        },
                        function update(update) {
                            update.transition()
                                .duration(200)
                                .attr("x1", 0)
                                .attr("x2", distributionPlotParams.plotWidth)
                                .attr("y1", d => yScale(d))
                                .attr("y2", d => yScale(d))
                        }
                    );

        // render data
        d3.select(`#distribution-analysis-data`)
            .attr("clip-path", `url(#distribution-clip)`)
            .selectAll("rect")
            .data(analysisBins)
            .join(
                function enter(enter) {
                    enter.append("rect")
                        .attr("fill", "#1f78b4")    // blue
                        .attr("stroke-width", 0)
                        .style("opacity", 0.5)
                        .attr("x", function(d) {    return xScale(d.x0) + 1;    })
                        .attr("y", function(d) {    return yScale(d.length);    })
                        .attr("width", function(d) {    return xScale(d.x1) - xScale(d.x0); })
                        .attr("height", function(d) {   return distributionPlotParams.plotHeight - yScale(d.length);    });
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("x", function(d) {    return xScale(d.x0)+1;    })
                        .attr("y", function(d) {    return yScale(d.length);    })
                        .attr("width", function(d) {    return xScale(d.x1) - xScale(d.x0); })
                        .attr("height", function(d) {   return distributionPlotParams.plotHeight - yScale(d.length);    });
                }
            )

        d3.select(`#distribution-forecast-data`)
            .attr("clip-path", `url(#distribution-clip)`)
            .selectAll("rect")
            .data(forecastBins)
            .join(
                function enter(enter) {
                    enter.append("rect")
                        .attr("fill", "#33a02c")    // green
                        .attr("stroke-width", 0)
                        .style("opacity", 0.5)
                        .attr("x", function(d) {    return xScale(d.x0) + 1;    })
                        .attr("y", function(d) {    return yScale(d.length);    })
                        .attr("width", function(d) {    return xScale(d.x1) - xScale(d.x0); })
                        .attr("height", function(d) {   return distributionPlotParams.plotHeight - yScale(d.length);    });
                },
                function update(update) {
                    update.transition()
                        .duration(200)
                        .attr("x", function(d) {    return xScale(d.x0) + 1;    })
                        .attr("y", function(d) {    return yScale(d.length);    })
                        .attr("width", function(d) {    return xScale(d.x1) - xScale(d.x0); })
                        .attr("height", function(d) {   return distributionPlotParams.plotHeight - yScale(d.length);    });
                }
            )
        
        // render textual information
        d3.select(`#distribution-text`)
            .text(function() {
                return `Distribution of ${wrfHydroStateVariables[stateVariable].commonName}`
            });
    });
}

function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(function(x) {
            return [x, d3.mean(V, function(v) { return kernel(x - v); })];
        });
    };
  }
  
function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}