import { uiParameters } from './uiParameters.js';

class Tooltip {
    constructor(selection, callback, vpWidth, vpHeight) {
        if (!selection || !selection.size()) {
            throw "Requires a tooltip div element selection";
        }
        if (!callback || typeof callback !== "function") {
            throw "ToolTip.display requires a callback function that returns an HTML string";
        }
        this._callback = callback;
        this._selection = selection;
        this.vpWidth = vpWidth;
        this.vpHeight = vpHeight;
    }
  
    move(event) {
        if (!event) return;
        // const margin = Math.round(this.vpWidth * 0.1);
        const { clientX: x, clientY: y } = event;
        const left = x;
        // this.clamp(
        //     margin,
        //     x,
        //     this.vpWidth - margin
        // );
        const top = y;
        // window.innerHeight > y + margin + this.vpHeight
        //   ? y + margin
        //   : y - this.vpHeight - margin;
        this.selection.style("top", `${top}px`).style("left", `${left}px`);
    }
  
    display(datum) {
        this.selection.style("display", "block").html(this._callback(datum));
    }
  
    hide() {
        this.selection.style("display", "none").html("");
    }
  
    clamp(min, d, max) {
        return Math.max(min, Math.min(max, d));
    }
  
    get selection() {
        return this._selection;
    }
  
    set selection(sel) {
        if (sel && sel.size()) {
            this._selection = sel;
        } 
        else {
            throw "selection must be a non-empty selected element";
        }
    }
}

export function setupTooltip(vpWidth, vpHeight) {
    const tooltipDiv = d3.select("#geoMap-div")
                        .append("div")
                        .attr("id", "tooltip-div");

    function setupTooltipContent(d) {
        if ('line' in d) {
            return "LinkID: " + d.linkID + "<br/>Src: " + d.line.coordinates[0].map(x => x.toFixed(2)).join(', ') + "<br/>Dst: " + 
                    d.line.coordinates[d.line.coordinates.length-1].map(x => x.toFixed(2)).join(', ') + 
                    (('qlink1' in d) ? ("<br/>Value: " + d3.format(".3")(d.qlink1) + " cu.m/s") : "") + (('z_gwsubbas' in d) ? "<br/>Value: " + d3.format(".3")(d.z_gwsubbas) + " m": "");
        }
        else {
            const lon = (d.location[0] > 180) ? d.location[0] - 360 : ((d.location[0] < -180) ? d.location[0] + 360 : d.location[0]);
            return "Gauge Location: (" + Math.round(lon * 100)/100 + ", " + Math.round(d.location[1] * 100)/100 + ")<br/>LinkID: " + d.linkID;
        }
    }

    const tooltip = new Tooltip(tooltipDiv, setupTooltipContent, vpWidth, vpHeight);
    return tooltip;
}

export function getJSDateObjectFromTimestamp(timestampString) {
    return new Date(
        timestampString.substring(0,4),   // year
        timestampString.substring(4,6),    // month
        timestampString.substring(6,8),   // day
        timestampString.substring(8)  // hours
    );
}

export const wrfHydroStateVariables = {
    qlink1: {
        commonName: 'Streamflow',
        units: 'cubic meter/second',
        description: 'Amount of water flow per unit time'
    },
    z_gwsubbas: {
        commonName: 'Bucket',
        units: 'meter',
        description: 'Elevation of water in the basin or bucket'
    }
}

export function captializeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function downloadSvg(svgID, svgWidth=0, svgHeight=0) {
    var filename = ''
    switch (svgID) {
        case 'geoMap-svg':
            filename = `hydroVis_map_${uiParameters.stateVariable}_${uiParameters.aggregation}_${uiParameters.daStage}_${uiParameters.inflation}_${uiParameters.timestamp}.png`;
            break;
        case 'hydrographSV-svg':
            filename = `hydroVis_hydrograph_stateVariable_${uiParameters.stateVariable}_${uiParameters.aggregation}.png`;
            break;
        case 'hydrographInf-svg':
            filename = `hydroVis_hydrograph_inflation_${uiParameters.stateVariable}_${uiParameters.inflation}.png`;
            break;
        case 'distribution-svg':
            filename = `hydroVis_distribution_${uiParameters.stateVariable}_${uiParameters.timestamp}.png`;
            break;
    }

    var svgElement = d3.select(`#${svgID}`).node().cloneNode(true);
    svgElement.getElementById("download-button").remove();

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], {  type: "image/svg+xml" });
    const svgDataUrl = URL.createObjectURL(blob);

    const image = new Image();
    image.addEventListener("load", () => {
        const width = svgWidth == 0 ? svgElement.getAttribute("width") : svgWidth;  // getAttribute does not work for svg which have width and height set relative to the parent div
        const height = svgHeight == 0 ? svgElement.getAttribute("height") : svgHeight;
        const canvas = document.createElement("canvas");

        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/png");

        // download the image
        var a = document.createElement('a');
        a.download = filename;
        a.href = dataUrl;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(blob);
    });

    image.src = svgDataUrl;
}