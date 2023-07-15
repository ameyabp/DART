class hydrographPlotParams {
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

    static legendRectWidth = 0;
    static legendRectHeight = 0;
    
    static setDivWidth(width) {
        this.divWidth = width;
        this.plotWidth = this.divWidth - this.leftMargin - this.rightMargin;
        this.legendRectWidth = this.plotWidth * 0.05;
    }

    static setDivHeight(height) {
        this.divHeight = height;
        this.plotHeight = this.divHeight - this.topMargin - this.bottomMargin;
        this.legendRectHeight = this.plotHeight * 0.05;
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

}

export async function setupHydrographPlots() {
    hydrographPlotParams.setDivHeight(document.getElementById("hydrograph-div").clientHeight);
    hydrographPlotParams.setDivWidth(document.getElementById("hydrograph-div").clientWidth * 0.95);

    var hydrographSvg = d3.select("#hydrograph-div")
                            .append("svg")
                            .attr("width", "100%")
                            .attr("height", "100%")
                            .attr("id", "hydrograph-svg");

    // setup y axis
    hydrographSvg.append("g")
                .attr("id", "hydrograph-yAxis")
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.topMargin})`)

    hydrographSvg.append("text")
                .text("State variable")
                .attr("id", "hydrograph-yAxis-label")
                .attr("x", -hydrographPlotParams.topMargin-(hydrographPlotParams.divHeight-hydrographPlotParams.topMargin-hydrographPlotParams.bottomMargin)/2)
                .attr("y", 0)
                .attr("font-size", hydrographPlotParams.axesLabelFontSize)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "hanging")
                .attr("transform", `rotate(-90)`);

    var yScale = d3.scaleLinear()
                .domain([0, 1])
                .range([hydrographPlotParams.plotHeight, 0])
                .nice();

    var yAxis = d3.axisLeft(yScale)
                .ticks(5);

    d3.select(`#hydrograph-yAxis`)
        .call(yAxis);

    // setup x axis
    hydrographSvg.append("g")
                .attr("id", `hydrograph-xAxis`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.divHeight - hydrographPlotParams.bottomMargin})`);

    hydrographSvg.append("text")
                .text("Time")
                .attr("x", hydrographPlotParams.leftMargin + (hydrographPlotParams.divWidth-hydrographPlotParams.leftMargin-hydrographPlotParams.rightMargin)/2)
                .attr("y", hydrographPlotParams.divHeight-5)
                .attr("font-size", hydrographPlotParams.axesLabelFontSize)
                .attr("text-anchor", "middle")
                .attr("alignment-baseline", "baseline");

    var xScale = d3.scaleLinear()
            .domain([0, 1])
            .range([0, hydrographPlotParams.plotWidth])
            .nice();

    var xAxis = d3.axisBottom(xScale)
            .ticks(5);

    d3.select(`#hydrograph-xAxis`)
    .call(xAxis);

    // setup plot area
    hydrographSvg.append("g")
                .attr("id", `hydrograph-plot`)
                .attr("transform", `translate(${hydrographPlotParams.leftMargin}, ${hydrographPlotParams.topMargin})`)
            // clip path
                .append("clipPath")
                .attr("id", `hydrograph-clip`)
                .append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", hydrographPlotParams.plotWidth)
                .attr("height", hydrographPlotParams.plotHeight);

    // gridlines
    hydrographSvg.select(`#hydrograph-plot`)
                .append("g")
                .attr("id", `hydrograph-gridlines`)
                .attr("clip-path", `url(#hydrograph-clip)`)
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
    hydrographSvg.select("#hydrograph-plot")
                .append("g")
                .attr("id", "hydrograph-forecast-data");

    hydrographSvg.select("#hydrograph-plot")
                .append("g")
                .attr("id", "hydrograph-analysis-data");

    hydrographSvg.select("#hydrograph-plot")
                .append("g")
                .attr("id", "hydrograph-observation-data");

    // legend
    hydrographSvg.select("#hydrograph-plot")
                .append("g")
                .attr("id", "hydrograph-legend");

    d3.select(`#hydrograph-legend`)
        .selectAll("rect")
        .data(hydrographPlotParams.legend)
        .enter()
            .append("rect")
            .attr("x", hydrographPlotParams.plotWidth * 0.8)
            .attr("y", function(d, i) {
                return (hydrographPlotParams.legendRectHeight + hydrographPlotParams.legendVerticalPadding) * i + hydrographPlotParams.legendVerticalPadding;
            })
            .attr("width", hydrographPlotParams.legendRectWidth)
            .attr("height", hydrographPlotParams.legendRectHeight)
            .style("stroke-width", 0)
            .style("fill", function(d) {    return d.color; })
            .style("opacity", 0.5);
        
    d3.select(`#hydrograph-legend`)
        .selectAll("text")
        .data(hydrographPlotParams.legend)
        .enter()
            .append("text")
            .text(function(d) { return d.daStage;   })
            .attr("font-size", hydrographPlotParams.legendLabelFontSize)
            .attr("x", hydrographPlotParams.plotWidth * 0.8 + hydrographPlotParams.legendRectWidth + hydrographPlotParams.legendHorizontalPadding)
            .attr("y", function(d, i) {
                return (hydrographPlotParams.legendRectHeight + hydrographPlotParams.legendVerticalPadding) * i + hydrographPlotParams.legendVerticalPadding;
            })
            .attr("text-anchor", "start")
            .attr("alignment-baseline", "hanging");

    // setup details text panel
    hydrographSvg.append("text")
                    .attr("id", `hydrograph-text`)
                    .attr("transform", `translate(${hydrographPlotParams.leftMargin}, 0)`)
                    .attr("text-anchor", "start")
                    .attr("alignment-baseline", "hanging")
}

export async function drawHydrograph() {

}