export async function drawData(tooltip, path, timestamp, aggregation, daStage, stateVariable, inflation=null) {

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

        // var wrf_hydro_data = [
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-81.76, 28.28],
        //                 [-83.46, 32.96]
        //             ]
        //         },
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-86.69, 32.59],
        //                 [-86.07, 35.90]
        //             ]
        //         },
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-81.06, 34.01],
        //                 [-78.88, 35.31]
        //             ]
        //         },
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-78.30, 37.68],
        //                 [-80.39, 38.73]
        //             ]
        //         },
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-82.74, 40.55],
        //                 [-77.53, 41.10]
        //             ]
        //         },
        //         {
        //             'type': 'LineString',
        //             'coordinates': [
        //                 [-75.32, 43.12],
        //                 [-72.74, 44.01]
        //             ]
        //         }
        // ]

        console.log(wrf_hydro_data);

        var flow_data = d3.select("#geoMap-div")
                            .select("#geo-zoom")
                            .append("g")
                            .attr("id", "wrf-hydro-data")
                            .selectAll("path")
                            .data(wrf_hydro_data) // TODO: implement an index for better performance

        flow_data.enter()
                .append("path")
                .attr("d", function(d) {    return path(d.line) })
                .attr("stroke-width", 0.1)
                .attr("stroke", "rgba(0, 0, 0, 64)")
                .style("fill", "None")
                .merge(flow_data)
                .on("mouseover", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("stroke", "rgba(128, 128, 128, 64)")

                    tooltip.display(d);
                })
                .on("mousemove", function(event, d) {
                    tooltip.move(event)
                })
                .on("mouseout", function(event, d) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("stroke", "rgba(0, 0, 0, 64)")

                    tooltip.hide();
                });
    })
}