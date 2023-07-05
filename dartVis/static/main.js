import {drawBaseMap} from './baseMap.js';
import {drawData} from './render.js';
import {setupTooltip} from './helper.js';

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

async function populateDropdownForStateVariables() {
    var defaultStateVariable = null;

    await d3.json('/getStateVariables',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        d3.select("#controlPanel-div")
            .append("select")
            .attr("id", "selectStateVariable-dropdown")
            .selectAll("option")
            .data(data)
            .enter()
                .append("option")
                .text(function(d) { return d; })
                .attr("value", function(d) { return d })
                .on("change", function() {
                    console.log(this.value);
                })
        
        d3.select("#selectStateVariable-dropdown")
            .property("selected", data[0]);

        defaultStateVariable = data[0];
    })

    return defaultStateVariable;
}

async function init() {
    const baseParams = await drawBaseMap();
    const tooltip = setupTooltip(baseParams.vpWidth, baseParams.vpheight);

    // setup UI elements
    const defaultStateVariable = await populateDropdownForStateVariables();

    // drawData(geoPath_operator, timestamp, aggregation, daStage, stateVariable, inflation)
    const data = drawData(tooltip, baseParams.path, '2022101400', 'mean', 'analysis', defaultStateVariable);
}

init();