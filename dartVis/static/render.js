function getColorScale(data) {
    return d3.scaleSequential(d3.interpolateRainbow)
                .domain(data);
}

function getSizeScale(data) {
    return d3.scaleLinear()
                .domain(data)
                .range([0.5, 10])
}

export async function drawMapData(tooltip, path, timestamp, aggregation, daStage, colorEncodingStateVariable, sizeEncodingStateVariable, distributionPlotParams, inflation=null) {

    d3.json('/getStateData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
                timestamp: timestamp,
                aggregation: aggregation,
                daStage: daStage,
                colorEncodingStateVariable: colorEncodingStateVariable,
                sizeEncodingStateVariable: sizeEncodingStateVariable,
                inflation: inflation
            })
    })
    .then(function(wrf_hydro_data) {
        console.log(wrf_hydro_data);

        var colorScale = getColorScale(d3.extent(wrf_hydro_data, d => d[colorEncodingStateVariable]));
        var sizeScale = getSizeScale(d3.extent(wrf_hydro_data, d => d[colorEncodingStateVariable]));

        var flow_data = d3.select("#wrf-hydro-data")
                            .selectAll("path")
                            .data(wrf_hydro_data, d => d.linkID)
                            .join(
                                function enter(enter) {
                                    enter.append("path")
                                        .attr("d", function(d) {    return path(d.line) })
                                        .attr("stroke-width", function(d) {
                                            return sizeScale(d[sizeEncodingStateVariable]);
                                        })
                                        .attr("stroke", function(d) {
                                            return colorScale(d[colorEncodingStateVariable]);
                                        })
                                        .style("fill", "None")
                                        .on("mouseover", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", 2 * sizeScale(d[sizeEncodingStateVariable]));
                                            
                                                tooltip.display(d);
                                        })
                                        .on("mousemove", function(event, d) {
                                            tooltip.move(event)
                                        })
                                        .on("mouseout", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", sizeScale(d[sizeEncodingStateVariable]));
            
                                            tooltip.hide();
                                        })
                                        .on("click", function(event, d) {
                                            drawDistribution(d.linkID, timestamp, daStage, 'qlink1', distributionPlotParams);
                                        });
                                },
                                function update(update) {
                                    update.attr("d", function(d) {    return path(d.line) })
                                        .attr("stroke-width", function(d) {
                                            return sizeScale(d[sizeEncodingStateVariable]);
                                        })
                                        .attr("stroke", function(d) {
                                            return colorScale(d[colorEncodingStateVariable]);
                                        })
                                        .style("fill", "None")
                                        .on("mouseover", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", 2 * sizeScale(d[sizeEncodingStateVariable]));
                                            
                                                tooltip.display(d);
                                        })
                                        .on("mousemove", function(event, d) {
                                            tooltip.move(event)
                                        })
                                        .on("mouseout", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", sizeScale(d[sizeEncodingStateVariable]));
            
                                            tooltip.hide();
                                        })
                                        .on("click", function(event, d) {
                                            drawDistribution(d.linkID, timestamp, daStage, 'qlink1', distributionPlotParams);
                                        });
                                }
                            )
    })
}

export async function distributionPlotScaffold() {
    const leftMargin = 75;
    const bottomMargin = 50;
    const topMargin = 20;
    const rightMargin = 0;
    const axesLabelFontSize = 15;
    const axesTickLabelFontSize = 10;

    var distributionSvg = d3.select("#distribution-div")
                            .append("svg")
                            .attr("width", "100%")
                            .attr("height", "100%")
                            .attr("id", "distribution-svg");

    const divHeight = document.getElementById("distribution-div").clientHeight;
    const divWidth = document.getElementById("distribution-div").clientWidth * 0.95;

    distributionSvg.append("g")
                    .attr("id", "distribution-xAxis")
                    .attr("transform", `translate(${leftMargin}, ${divHeight - bottomMargin})`);

    distributionSvg.append("g")
                    .attr("id", "distribution-yAxis")
                    .attr("transform", `translate(${leftMargin}, ${topMargin})`);

    distributionSvg.append("text")
                    .text("Ensemble Model Outputs")
                    .attr("x", leftMargin + (divWidth-leftMargin-rightMargin)/2)
                    .attr("y", divHeight-5)
                    .attr("font-size", axesLabelFontSize)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "baseline");
                    
    distributionSvg.append("text")
                    .text("Distribution")
                    .attr("x", -topMargin-(divHeight-topMargin-bottomMargin)/2)
                    .attr("y", 0)
                    .attr("font-size", axesLabelFontSize)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("transform", `rotate(-90)`);

    distributionSvg.append("g")
                    .attr("id", "distribution-plot")
                    .attr("transform", `translate(${leftMargin}, ${topMargin})`)

    distributionSvg.append("text")
                    .attr("id", "linkID-text")
                    .attr("transform", `translate(${divWidth * 0.9}, ${2 * topMargin})`)

    return {
        leftMargin: leftMargin,
        bottomMargin: bottomMargin,
        topMargin: topMargin,
        rightMargin: rightMargin,
        axesTickLabelFontSize: axesTickLabelFontSize,
        distributionPlotDivWidth: divWidth,
        distributionPlotDivHeight: divHeight
    };
}

export async function drawDistribution(linkID, timestamp, daStage, stateVariable, distributionPlotParams) {
    d3.json('/getEnsembleData',
    {
        method: 'POST',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
                timestamp: timestamp,
                daStage: daStage,
                stateVariable: stateVariable,
                linkID: linkID
            })
    }).then(function(data) {
        console.log(data);
        var xScale = d3.scaleLinear()
                        .domain(d3.extent(data, d => d[stateVariable]))
                        .range([0, distributionPlotParams.distributionPlotDivWidth - distributionPlotParams.leftMargin - distributionPlotParams.rightMargin]);

        var xAxis = d3.axisBottom(xScale)
                        .ticks(10);

        d3.select("#distribution-xAxis")
            .call(xAxis);

        var yScale = d3.scaleLinear()
                        .domain([0, 1])
                        .range([distributionPlotParams.distributionPlotDivHeight - distributionPlotParams.topMargin - distributionPlotParams.bottomMargin, 0]);

        var yAxis = d3.axisLeft(yScale)
                    .ticks(5);

        d3.select("#distribution-yAxis")
            .call(yAxis);

        // var n = data.length;
        // var bins = d3.histogram().domain(xScale.domain()).thresholds(40)(data);
        var density = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(80))(data.map(d => d[stateVariable]));

        console.log(density);

        d3.select("#distribution-plot")
            .selectAll("path")
            .data([density])
            .join(
                function enter(enter) {
                    enter.append("path")
                        .attr("fill", "steelblue")
                        .attr("stroke-width", 0)
                        .attr("d", d3.area()
                                    .x(function(d) {    return xScale(d[0]);    })
                                    .y0(yScale(0))
                                    .y1(function(d) {   return yScale(d[1]);    })
                        );
                },
                function update(update) {
                    update.attr("fill", "steelblue")
                        .attr("stroke-width", 0)
                        .transition()
                        .duration(200)
                        .attr("d", d3.area()
                                    .x(function(d) {    return xScale(d[0]);    })
                                    .y0(yScale(0))
                                    .y1(function(d) {   return yScale(d[1]);    })
                        );
                }
            )
            

        d3.select("#linkID-text")
            .text(`LinkID: ${linkID}`);
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