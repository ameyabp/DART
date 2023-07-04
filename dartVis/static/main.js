import {drawBaseMap} from './baseMap.js';

function populateDropdownForEnsembleModelTimestamps() {
    d3.json('/getEnsembleModelTimestamps',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        d3.select("#controlPanel-div")
            .append("select")
            .attr("id", "selectTimestamp-dropdown")
            .selectAll("option")
            .data(data)
            .join(
                function enter(enter) {
                    enter.append("option")
                        .text(function(d) {
                            return d.substring(0,4) + "/" + d.substring(4,6) + "/" + d.substring(6,8) + " " + d.substring(8) + " hrs"
                        })
                        .attr("value", function(d) {return d})
                }
            )
    })
}



function init() {
    const path = drawBaseMap();
}

init();