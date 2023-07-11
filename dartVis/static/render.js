function getColorScale(data) {
    return d3.scaleSequential(d3.interpolateRdBu)
                .domain(data);
}

function getSizeScale(data) {
    return d3.scaleLinear()
                .domain(data)
                .range([0.5, 10])
}

export async function drawMapData(tooltip, path, timestamp, aggregation, daStage, colorEncodingStateVariable, sizeEncodingStateVariable, inflation=null) {

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
                                        });
                                },
                                function update(update) {
                                    update.append("path")
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
                                        });
                                }
                            )
    })
}

export async function drawDistribution(linkID) {

}