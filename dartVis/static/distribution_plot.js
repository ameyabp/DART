class distributionPlotParams {
    static leftMargin = 50;
    static bottomMargin = 50;
    static topMargin = 20;
    static rightMargin = 10;

    static divWidth = 0;
    static divHeight = 0;

    static plotWidth = 0;
    static plotHeight = 0;

    static axesLabelFontSize = 15;
    static axesTickLabelFontSize = 10;

    static yScale = null;
    static yAxis = null;

    static xScale = [null, null, null];
    static xAxis = [null, null, null];

    static plotID = 1;

    static setDivWidth(width) {
        this.divWidth = width;
        this.plotWidth = this.divWidth - this.leftMargin - this.rightMargin;
    }

    static setDivHeight(height) {
        this.divHeight = height;
        this.plotHeight = this.divHeight - this.topMargin - this.bottomMargin;
    }

    static setVerticalAxis(scale, axis) {
        this.yScale = scale;
        this.yAxis = axis;
    }

    static setHorizontalAxis(axis, plotID) {
        this.xAxis[plotID] = axis;
    }
    
    static setHorizontalScale(scale, plotID) {
        this.xScale[plotID] = scale;
    }

    static updatePlotID() {
        // toggle between 1 and 2
        this.plotID = this.plotID % 2 + 1;
    }

    static getPlotID() {
        return this.plotID;
    }
}

function setupDistributionPlot(id) {
    const divIdPrefix = `distribution${id}`

    var distributionSvg = d3.select(`#${divIdPrefix}-div`)
                            .append("svg")
                            .attr("width", "100%")
                            .attr("height", "100%")
                            .attr("id", `${divIdPrefix}-svg`);

    // setup y axis
    distributionSvg.append("g")
                    .attr("id", `${divIdPrefix}-yAxis`)
                    .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.topMargin})`);

    distributionSvg.append("text")
                    .text("Distribution")
                    .attr("x", -distributionPlotParams.topMargin-(distributionPlotParams.divHeight-distributionPlotParams.topMargin-distributionPlotParams.bottomMargin)/2)
                    .attr("y", 0)
                    .attr("font-size", distributionPlotParams.axesLabelFontSize)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "hanging")
                    .attr("transform", `rotate(-90)`);

    var yScale = d3.scaleLinear()
                    .domain([0, 1])
                    .range([distributionPlotParams.plotHeight, 0])
                    .nice();

    var yAxis = d3.axisLeft(yScale)
                .ticks(5);

    d3.select(`#${divIdPrefix}-yAxis`)
        .call(yAxis);

    distributionPlotParams.setVerticalAxis(yScale, yAxis);

    // setup x axis
    distributionSvg.append("g")
                .attr("id", `${divIdPrefix}-xAxis`)
                .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.divHeight - distributionPlotParams.bottomMargin})`);

    distributionSvg.append("text")
                .text("Ensemble Model Outputs")
                .attr("x", distributionPlotParams.leftMargin + (distributionPlotParams.divWidth-distributionPlotParams.leftMargin-distributionPlotParams.rightMargin)/2)
                .attr("y", distributionPlotParams.divHeight-5)
                .attr("font-size", distributionPlotParams.axesLabelFontSize)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "baseline");

    var xScale = d3.scaleLinear()
                    .domain([0, 1])
                    .range([0, distributionPlotParams.plotWidth])
                    .nice();

    var xAxis = d3.axisBottom(xScale)
                    .ticks(5);

    d3.select(`#${divIdPrefix}-xAxis`)
        .call(xAxis);

    distributionPlotParams.setHorizontalAxis(xAxis, id);
    distributionPlotParams.setHorizontalScale(xScale, id);

    // setup plot area
    distributionSvg.append("g")
                    .attr("id", `${divIdPrefix}-plot`)
                    .attr("transform", `translate(${distributionPlotParams.leftMargin}, ${distributionPlotParams.topMargin})`)
    // clip path
                    .append("clipPath")
                    .attr("id", `${divIdPrefix}-clip`)
                    .append("rect")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", distributionPlotParams.plotWidth)
                    .attr("height", distributionPlotParams.plotHeight);

    // gridlines
    distributionSvg.select(`#${divIdPrefix}-plot`)
                    .append("g")
                    .attr("id", `${divIdPrefix}-gridlines`)
                    .attr("clip-path", `url(#${divIdPrefix}-clip)`)
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
    // distributionSvg.select(`#${divIdPrefix}-plot`)
    //                 .append("g")
    //                 .attr("id", `${divIdPrefix}-data`);

    // setup details text panel
    distributionSvg.append("text")
                    .attr("id", `${divIdPrefix}-text`)
                    .attr("transform", `translate(${2 * distributionPlotParams.leftMargin}, 0)`)
                    .attr("text-anchor", "start")
                    .attr("alignment-baseline", "hanging")

    // zoom
    var zoom = d3.zoom()
                .scaleExtent([1,4])
                .extent([[0, 0], [distributionPlotParams.plotWidth, distributionPlotParams.plotHeight]])
                .translateExtent([[0, 0], [distributionPlotParams.plotWidth, distributionPlotParams.plotHeight]])
                .on("zoom", function(event) {
                    zoomDistributionPlot(event, id);
                })

    distributionSvg.call(zoom);
}

function zoomDistributionPlot(event, plotID) {
    const divIdPrefix = `distribution${plotID}`
    var newYScale = event.transform.rescaleY(distributionPlotParams.yScale);

    // render zoomed vertical axis
    d3.select(`#${divIdPrefix}-yAxis`)
        .call(distributionPlotParams.yAxis.scale(newYScale));

    // render zoomed gridlines
    d3.select(`#${divIdPrefix}-gridlines`)
        .selectAll("line")
        .attr("y1", d => newYScale(d))
        .attr("y2", d => newYScale(d))

    // render zoomed data
    d3.select(`#${divIdPrefix}-data`)
        .selectAll("path")
        .attr("d", d3.area()
            .x(function(d) {    return distributionPlotParams.xScale[plotID](d[0]);    })
            .y0(newYScale(0))
            .y1(function(d) {   return newYScale(d[1]);    }
        )
    );
}

export async function setupDistributionPlots() {
    distributionPlotParams.setDivHeight(document.getElementById("distribution1-div").clientHeight);
    distributionPlotParams.setDivWidth(document.getElementById("distribution1-div").clientWidth * 0.95);

    // setup the distribution plots for comparing performance of all the models 
    // at two different locations, at the same time stamp
    setupDistributionPlot(1);
    setupDistributionPlot(2);

    return null;
}

export async function drawDistribution(linkID, timestamp, daStage, stateVariable) {
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
        
        const distributionPlotID = distributionPlotParams.getPlotID();
        const divIdPrefix = `distribution${distributionPlotID}`;
        distributionPlotParams.updatePlotID();

        var xScale = d3.scaleLinear()
                        .domain(d3.extent(data, d => d[stateVariable]))
                        .range([0, distributionPlotParams.plotWidth])
                        .nice();

        distributionPlotParams.setHorizontalScale(xScale, distributionPlotID);

        d3.select(`#${divIdPrefix}-xAxis`)
            .call(distributionPlotParams.xAxis[distributionPlotID].scale(xScale));

        // var n = data.length;
        // var bins = d3.histogram().domain(xScale.domain()).thresholds(40)(data);
        var density = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(80))(data.map(d => d[stateVariable]));

        console.log(density);

        // clean old data
        d3.select(`#${divIdPrefix}-data`).remove();

        d3.select(`#${divIdPrefix}-plot`)
            .append("g")
            .attr("id", `${divIdPrefix}-data`)
            .append("path")
            .attr("clip-path", `url(#${divIdPrefix}-clip)`)
            .datum(density)
            .attr("fill", "steelblue")
            .attr("stroke-width", 0)
            .attr("d", d3.area()
                        .x(function(d) {    return xScale(d[0]);    })
                        .y0(distributionPlotParams.yScale(0))
                        .y1(function(d) {   return distributionPlotParams.yScale(d[1]);    })
            );
            // .selectAll("path")
            // .data([density])
            // .join(
            //     function enter(enter) {
            //         enter.append("path")
            //             .attr("fill", "steelblue")
            //             .attr("stroke-width", 0)
            //             .attr("d", d3.area()
            //                         .x(function(d) {    return xScale(d[0]);    })
            //                         .y0(distributionPlotParams.yScale(0))
            //                         .y1(function(d) {   return distributionPlotParams.yScale(d[1]);    })
            //             );
            //     },
                // function update(update) {
                //     update.attr("fill", "steelblue")
                //         .attr("stroke-width", 0)
                //         .transition()
                //         .duration(200)
                //         .attr("d", d3.area()
                //                     .x(function(d) {    return xScale(d[0]);    })
                //                     .y0(distributionPlotParams.yScale(0))
                //                     .y1(function(d) {   return distributionPlotParams.yScale(d[1]);    })
                //         );
                // }
            // )
            

        d3.select(`#${divIdPrefix}-text`)
            .text(`LinkID: ${linkID} from (lon, lat) to (lon, lat)`);
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