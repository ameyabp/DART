const continentalUSStates = [
    'Alabama',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'District of Columbia',
    'Florida',
    'Georgia',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming'
]

const falseConusArcIDs = [
    89, 103, 126, 84, 76, 69, 14, 65, 50, 87, 66, 70, 127, 96, 98, 100, 128, 71, 137, 115, 114, 117, 67, 122, 125, 124, 123, 91, 138, 139
]

export async function fetchMapData() {
    // arcs is an array of arrays, where each constituent array 
    // represents the points constituting an arc
    var arcs = [];
    var conusPointsData;

    await d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
        .then(function(data) {
            // console.log(data);
            data.arcs.map(function(arc) {
                var x = 0, y = 0;
                var points = [];
                arc.map(function(point2d) {
                    var point3d = []
                    point3d.push((x += point2d[0]) * data.transform.scale[0] + data.transform.translate[0]);
                    point3d.push((y += point2d[1]) * data.transform.scale[1] + data.transform.translate[1]);
                    point3d.push(0);  // z coordinate
                    point3d.push(1);  // w cordinate for matrix operations
          
                    // white color
                    point3d.push(1);
                    point3d.push(1);
                    point3d.push(1);
                    point3d.push(1);

                    points.push(point3d);
                });
                // gather all the dequantized arcs in the lon-lat coordinate space
                arcs.push(points);
            });

            // console.log(arcs);

            var conusArcs = new Set();  // stores all the unique arcIDs which form the continental US states
            for (let i=0; i<data.objects.states.geometries.length; i++) {
                const state = data.objects.states.geometries[i];
                if (continentalUSStates.includes(state.properties.name)) {
                    // each state may have 1 or more polygons
                    // each of which is stored in a separate array of arcs
                    // iterate over each of these polygons (arc arrays)
                    state.arcs.map(function(arcArray) {
                        // individual polygons (arc arrays) contain indices to the global arcs array
                        if (state.type === 'Polygon') {
                            arcArray.map(function(arcID) {
                                if (!falseConusArcIDs.includes(arcID >= 0 ? arcID : arcs.length+arcID)) {
                                    // if (conusArcs.get(arcID >= 0 ? arcID : arcs.length+arcID))
                                    //     conusArcs.get(arcID >= 0 ? arcID : arcs.length+arcID).push(state.properties.name)
                                    // else
                                    //     conusArcs.set(arcID >= 0 ? arcID : arcs.length+arcID, [state.properties.name])
                                    conusArcs.add(arcID >= 0 ? arcID : arcs.length+arcID);
                                }
                            })
                        }
                        else {  // state.type === 'MultiPolygon'
                            arcArray.map(function(arr) {
                                arr.map(function(arcID) {
                                    if (!falseConusArcIDs.includes(arcID >= 0 ? arcID : arcs.length+arcID)) {
                                        // if (conusArcs.get(arcID >= 0 ? arcID : arcs.length+arcID))
                                        //     conusArcs.get(arcID >= 0 ? arcID : arcs.length+arcID).push(state.properties.name)
                                        // else
                                        //     conusArcs.set(arcID >= 0 ? arcID : arcs.length+arcID, [state.properties.name])
                                        conusArcs.add(arcID >= 0 ? arcID : arcs.length+arcID);
                                    }
                                })
                            })
                        }
                    })
                }
            }

            // get all the arc points which form the continental US states
            // extract arc points from each arc array
            // also compute min, max and mean values for normalizing the points to normalized device coordinate space
            var minX = Number.POSITIVE_INFINITY;
            var minY = Number.POSITIVE_INFINITY;
            var maxX = Number.NEGATIVE_INFINITY;
            var maxY = Number.NEGATIVE_INFINITY;
            var meanX = 0;
            var meanY = 0;
            var numTotalPoints = 0;

            const conusArcsArray = Array.from(conusArcs);
            // console.log(conusArcs);
            var arcData = [];
            conusArcsArray.map(function(arcID) {
                var arcPoints = {
                    'arcID': arcID,
                    'points': new Float32Array(arcs[arcID].flat()),
                    'numPoints': arcs[arcID].length
                }
                arcData.push(arcPoints);

                arcs[arcID].map(function(point) {
                    // if (point[0] < -127 || point[0] > -64 || point[1] > 51 || point[1] < 22) {
                    //     console.log(point)
                    //     console.log(arcID)
                    // }
                    minX = Math.min(minX, point[0]);
                    maxX = Math.max(maxX, point[0]);
                    minY = Math.min(minY, point[1]);
                    maxY = Math.max(maxY, point[1]);
                    meanX += point[0];
                    meanY += point[1];
                    numTotalPoints++;
                })
            });

            meanX /= numTotalPoints;
            meanY /= numTotalPoints;

            conusPointsData = {
                'arcData': arcData,
                'minX': minX,
                'maxX': maxX,
                'meanX': meanX,
                'minY': minY,
                'maxY': maxY,
                'meanY': meanY
            };
        });

    return conusPointsData;
}