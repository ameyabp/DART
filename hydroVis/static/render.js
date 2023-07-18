import { drawDistribution } from "./distribution_plot.js";
import { drawHydrograph } from "./hydrograph.js";
import { getMapColorScale, getMapSizeScale, generateLegendTicks } from "./baseMap.js";

export async function drawMapData(tooltip, path, timestamp, aggregation, daStage, stateVariable, inflation=null) {

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
                stateVariable: stateVariable,
                inflation: inflation
            })
    })
    .then(function(wrf_hydro_data) {
        console.log(wrf_hydro_data);

        var colorScale = getMapColorScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));
        var sizeScale = getMapSizeScale(d3.extent(wrf_hydro_data, d => d[stateVariable]));

        var flow_data = d3.select("#wrf-hydro-data")
                            .selectAll("path")
                            .data(wrf_hydro_data, d => d.linkID)
                            .join(
                                function enter(enter) {
                                    enter.append("path")
                                        .attr("d", function(d) {    return path(d.line) })
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
                                            
                                                tooltip.display(d);
                                        })
                                        .on("mousemove", function(event, d) {
                                            tooltip.move(event)
                                        })
                                        .on("mouseout", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", sizeScale(d[stateVariable]));
            
                                            tooltip.hide();
                                        })
                                        .on("click", function(event, d) {
                                            drawDistribution(d.linkID, timestamp, stateVariable);
                                            drawHydrograph(d.linkID, stateVariable, aggregation);
                                        });
                                },
                                function update(update) {
                                    update.attr("d", function(d) {    return path(d.line) })
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
                                            
                                                tooltip.display(d);
                                        })
                                        .on("mousemove", function(event, d) {
                                            tooltip.move(event)
                                        })
                                        .on("mouseout", function(event, d) {
                                            d3.select(this)
                                                .transition()
                                                .duration(100)
                                                .attr("stroke-width", sizeScale(d[stateVariable]));
            
                                            tooltip.hide();
                                        })
                                        .on("click", function(event, d) {
                                            drawDistribution(d.linkID, timestamp, stateVariable);
                                            drawHydrograph(d.linkID, stateVariable, aggregation);
                                        });
                                }
                            )

        generateLegendTicks(wrf_hydro_data.map(d => d[stateVariable]));
    })
}