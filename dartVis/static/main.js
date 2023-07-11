import {drawBaseMap} from './baseMap.js';
import {drawMapData} from './render.js';

class globalVisualizationUIParameters {
    constructor(tooltip, path) {
        this.timestamp = '2022101400';
        this.aggregation = 'mean';
        this.daStage = 'analysis';
        this.inflation = null;
        this.tooltip = tooltip;
        this.path = path;
    }

    init() {
        this.colorEncodingStateVariable = d3.select("#colorEncodingStateVariable-dropdown").node().value;
        this.sizeEncodingStateVariable = d3.select("#sizeEncodingStateVariable-dropdown").node().value;
        this.render();
    }

    getDefaultTimestamp() {
        return this.timestamp;
    }

    updateTimestamp(timestamp) {
        if (this.timestamp != timestamp) {
            this.timestamp = timestamp;
            this.render();
        }
    }

    updateAggregation(aggregation) {
        if (this.aggregation != aggregation) {
            this.aggregation = aggregation;
            this.render();
        }
    }

    updateDaStage(daStage) {
        if (this.daStage != daStage) {
            this.daStage = daStage;
            this.render();
        }
    }

    updateColorEncodingStateVariable(colorEncodingStateVariable) {
        if (this.colorEncodingStateVariable != colorEncodingStateVariable) {
            this.colorEncodingStateVariable = colorEncodingStateVariable;
            this.render();
        }
    }

    updateSizeEncodingStateVariable(sizeEncodingStateVariable) {
        if (this.sizeEncodingStateVariable != sizeEncodingStateVariable) {
            this.sizeEncodingStateVariable = sizeEncodingStateVariable;
            this.render();
        }
    }

    updateInflation(inflation) {
        if (this.inflation != inflation) {
            this.inflation = inflation;
            this.render();
        }
    }

    render() {
        drawMapData(this.tooltip, this.path, this.timestamp, this.aggregation, this.daStage, this.colorEncodingStateVariable, this.sizeEncodingStateVariable, this.inflation);
    }
}

async function populateDropdownForStateVariables() {
    await d3.json('/getStateVariables',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        // dropdown for color encoding
        d3.select("#controlPanel-div")
            .append("label")
            .attr("class", "encodingLabel")
            .attr("for", "colorEncodingStateVariable-dropdown")
            .html("Color encoding")
            .append("select")
            .attr("class", "encodingDropdown")
            .attr("id", "colorEncodingStateVariable-dropdown")
            .on("change", function() {
                console.log('color-encoding: ' + this.value);
            })
            .selectAll("option")
            .data(data)
            .enter()
                .append("option")
                .text(function(d) { return d; })
                .attr("value", function(d) { return d })
                .property("selected", function(d) {
                    return d === data[0];   // qlink1
                })

        // dropdown for size encoding
        d3.select("#controlPanel-div")
            .append("label")
            .attr("class", "encodingLabel")
            .attr("for", "sizeEncodingStateVariable-dropdown")
            .html("Size encoding")
            .append("select")
            .attr("class", "encodingDropdown")
            .attr("id", "sizeEncodingStateVariable-dropdown")
            .on("change", function() {
                console.log('size-encoding: ' + this.value);
            })  
            .selectAll("option")
            .data(data)
            .enter()
                .append("option")
                .text(function(d) { return d; })
                .attr("value", function(d) { return d })
                .property("selected", function(d) {
                    return d === data[1];   // z_gwssubbas
                })      
    })
}

async function populateTimeSlider(visParameters) {
    await d3.json('/getEnsembleModelTimestamps',
    {
        method: 'GET',
        headers: {
            'Content-type': 'application/json; charset=UTF-8'
        }
    })
    .then(function(data) {
        // sample timestamp - 2022101400
        data = data.map(function(d) {
            return new Date(
                d.substring(0,4),   // year
                d.substring(4,6),    // month
                d.substring(6,8),   // day
                d.substring(8)  // hours
            )
        });

        // console.log(data);

        d3.select("#timeSlider-div")
            .append("p")
            .attr("id", "timestamp-display")
            .text(function() {
                const d = d3.min(data);
                return `Timestamp: ${d.getFullYear()}/${d.getMonth()}/${d.getDate()} : ${d.getHours() > 9 ? d.getHours() : '0'+d.getHours()} Hrs`
            });

        var sliderDiv = d3.select("#timeSlider-div")
            .append("svg")
            .attr("id", "timeSlider")
            .attr("width", "100%")
            .attr("height", 100)
            .append("g")
            .attr("transform", `translate(50, 20)`)

        const width = document.getElementById('timeSlider-div').clientWidth * 0.75;

        var slider = d3.sliderHorizontal()
                        .min(d3.min(data))
                        .max(d3.max(data))
                        .width(width)
                        .displayValue(false)
                        .default(visParameters.getDefaultTimestamp())
                        .on('onchange', function(value) {
                            d3.select("#timestamp-display")
                                .text(`Timestamp: ${value.getFullYear()}/${value.getMonth() > 9 ? value.getMonth() : '0'+value.getMonth()}/${value.getDate() > 9 ? value.getDate() : '0'+value.getDate()} : ${value.getHours() > 9 ? value.getHours() : '0'+value.getHours()} Hrs`);
                        })
                        .on('end', function(value) {
                            const newTimestamp = `${value.getFullYear()}${value.getMonth() > 9 ? value.getMonth() : '0'+value.getMonth()}${value.getDate() > 9 ? value.getDate() : '0'+value.getDate()}${value.getHours() > 9 ? value.getHours() : '0'+value.getHours()}`;
                            visParameters.updateTimestamp(newTimestamp);
                        });
        
        sliderDiv.call(slider);
    })
}

async function init() {
    const baseParams = await drawBaseMap();

    const visParameters = new globalVisualizationUIParameters(baseParams.tooltip, baseParams.path);

    // setup UI elements
    await populateDropdownForStateVariables();
    const defaultTimestamp = await populateTimeSlider(visParameters);

    visParameters.init(defaultTimestamp);
}

init();