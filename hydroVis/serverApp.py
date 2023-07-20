import os
import json
import math
import argparse
import functools
import numpy as np
import netCDF4 as nc
from flask import Flask, render_template, request

app = Flask('dartVis')

class RouteLinkData:
    def __init__(self, routeLinkFileName):
        # struct definition for storing the route link data
        routeLinkData = nc.Dataset(routeLinkFileName)
        self.numLinks = len(routeLinkData.variables['link'][:])
        self.lat = routeLinkData.variables['lat'][:]
        self.lon = routeLinkData.variables['lon'][:]
        self.fromIndices = routeLinkData.variables['fromIndices'][:]
        self.fromIndsStart = routeLinkData.variables['fromIndsStart'][:]
        self.fromIndsEnd = routeLinkData.variables['fromIndsEnd'][:]
        noUpLinks = self.fromIndsStart == 0
        self.numUpLinks = self.fromIndsEnd - self.fromIndsStart + 1
        self.numUpLinks[noUpLinks] = 0

    def getDataBoundingBoxLonLat(self):
        self.bbox = {
            'lonMin': float(min(self.lon)),
            'lonMax': float(max(self.lon)),
            'latMin': float(min(self.lat)),
            'latMax': float(max(self.lat))
        }

        self.centroid = {
            'lon': float(np.mean(self.lon)),
            'lat': float(np.mean(self.lat))
        }

        return {
            'bbox': self.bbox,
            'centroid': self.centroid
        }

class Observations:
    def __init__(self, modelFilesPath, timestampList):
        self.timestampList = timestampList
        self.modelFilesPath = modelFilesPath
        self.observedLinkIDs = {}

        f = open(os.path.join(self.modelFilesPath, self.timestampList[0], f'obs_seq.final.{self.timestampList[0]}'), 'r')

        readLinkID = False
        readLoc = False
        location = None
        idx = 0

        line = f.readline()
        while line != '':
            if readLinkID:
                linkID = -1 * int(line.strip())
                assert linkID > 0
                self.observedLinkIDs[linkID] = {
                    'location': location,
                    'fileLine': idx - 173   # TODO: Remove hardcoding
                }
                location = None
                readLinkID = False

            if 'kind\n' in line:
                readLinkID = True
            
            if readLoc:
                coordinates = line.split()
                location = [
                    float(coordinates[0]) * 180 / math.pi,
                    float(coordinates[1]) * 180 / math.pi
                ]
                readLoc = False

            if 'loc3d\n' in line:
                readLoc = True

            idx += 1
            line = f.readline()

        # TODO: Account for multiple observations from the same location/gauge
        f.close()

    def getHydrographStateVariableData(self, linkID, aggregation):
        hydrographData = {}
        hydrographData['linkID'] = linkID

        # compute file line offsets from line number of ' OBS' string
        observationDataOffset = 1

        if aggregation == 'mean':
            forecastDataOffset = 2
            analysisDataOffset = 3
            hydrographData['agg'] = aggregation
        elif aggregation =='sd':
            forecastDataOffset = 4
            analysisDataOffset = 5
            hydrographData['agg'] = aggregation
        else:
            # individual member - indexed starting from 1
            forecastDataOffset = 2 * (int(aggregation)-1) + 6
            analysisDataOffset = 2 * (int(aggregation)-1) + 7
            hydrographData['agg'] = int(aggregation)

        hydrographData['data'] = []

        locationDataOffset = self.observedLinkIDs[linkID]['fileLine'] if linkID in self.observedLinkIDs else -1

        if locationDataOffset > 0:
            for timestamp in self.timestampList:
                f = open(os.path.join(self.modelFilesPath, timestamp, f'obs_seq.final.{timestamp}'), 'r')
                lines = f.readlines()

                data = {}
                data['timestamp'] = timestamp
                data['observation'] = lines[locationDataOffset + observationDataOffset].strip()
                data['forecast'] = lines[locationDataOffset + forecastDataOffset].strip()
                data['analysis'] = lines[locationDataOffset + analysisDataOffset].strip()

                hydrographData['data'].append(data)

        return hydrographData
    
    def getGaugeLocations(self):
        gaugeLocationData = []

        for linkID in self.observedLinkIDs:
            gaugeLocationData.append({
                'linkID': linkID,
                'location': self.observedLinkIDs[linkID]['location']
            })

        return gaugeLocationData
    
class Ensemble:
    def __init__(self, modelFilesPath, rlData):
        # list of timestamps for the ensemble models 
        self.modelFilesPath = modelFilesPath
        self.timestamps = [f for f in os.listdir(self.modelFilesPath) if os.path.isdir(os.path.join(self.modelFilesPath, f))]
        self.timestamps.sort()
        
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(self.modelFilesPath, self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = int(len(netcdfFiles)/4)

        # gathering meta data
        self.sampleOutputData = nc.Dataset(os.path.join(self.modelFilesPath, self.timestamps[0], netcdfFiles[0]))
        self.stateVariables = list(self.sampleOutputData.variables.keys())
        self.stateVariables.remove('time')

        # routeLink data
        self.rl = rlData

    def getUIParameters(self):
        return {
            'stateVariables': self.stateVariables,
            'numEnsembleModels': self.numEnsembleModels,
            'timestamps': self.timestamps
        }
    
    def getTimestamps(self):
        return self.timestamps
    
    def getStateData(self, timestamp, aggregation, daStage, stateVariable, inflation=None):
        # load required forecast data from netcdf files to python data structures in main memory
        # map data structure hierarchy: timestamp, aggregation, daStage, stateVariable, location

        print(timestamp, aggregation, daStage, stateVariable, inflation)

        # construct required netcdf file name
        if inflation:
            filename = f'{daStage}_{inflation}_{aggregation}.{timestamp}.nc'
        else:
            filename = f'{daStage}_{aggregation}.{timestamp}.nc'

        ncData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, filename))
        assert(self.rl.numLinks == len(ncData.variables[self.stateVariables[0]][:]))

        renderData = []
        for i in range(self.rl.numLinks):
            if self.rl.numUpLinks[i] == 0:
                continue

            linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]-1: self.rl.fromIndsEnd[i]]-1
            assert (self.rl.numUpLinks[i] == len(linkIndices))

            for linkID in linkIndices:
                dataPoint = {}
                dataPoint['linkID'] = int(linkID)

                dataPoint[stateVariable] = float(ncData.variables[stateVariable][linkID].item())
            
                lineData = {
                    'type': "LineString",
                    'coordinates': []
                }

                lineData['coordinates'].append([float(self.rl.lon[i]), float(self.rl.lat[i])])
                lineData['coordinates'].append([float(self.rl.lon[linkID]), float(self.rl.lat[linkID])])

                dataPoint['line'] = lineData
                renderData.append(dataPoint)
        
        return renderData
    
    def getEnsembleData(self, timestamp, stateVariable, linkID):
        ensembleData = []

        # construct required netcdf file name
        for id in range(self.numEnsembleModels):
            memberID = str(id+1).rjust(4, '0')
            analysisFilename = f'analysis_member_{memberID}.{timestamp}.nc'
            forecastFilename = f'preassim_member_{memberID}.{timestamp}.nc'

            memberAnalysisData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, analysisFilename))
            memberForecastData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, forecastFilename))

            dataPoint = {}
            dataPoint['memberID'] = id
            dataPoint[stateVariable] = {
                'analysis': float(memberAnalysisData.variables[stateVariable][linkID].item()),
                'forecast': float(memberForecastData.variables[stateVariable][linkID].item())
            }

            ensembleData.append(dataPoint)

        return {
            'lon': float(self.rl.lon[linkID]),
            'lat': float(self.rl.lat[linkID]),
            'ensembleData': ensembleData
        }

    def getHydrographStateVariableData(self, linkID, aggregation, stateVariable):
        hydrographData = {}
        hydrographData['linkID'] = linkID

        if aggregation == 'mean' or aggregation =='sd':
            hydrographData['agg'] = aggregation
        else:
            hydrographData['agg'] = int(aggregation)

        hydrographData['data'] = []
    
        for timestamp in self.timestamps:
            if aggregation == 'mean' or aggregation == 'sd':
                analysisFilename = f'analysis_{aggregation}.{timestamp}.nc'
                forecastFilename = f'preassim_{aggregation}.{timestamp}.nc'
            else:
                analysisFilename = f'analysis_{aggregation.rjust(4, "0")}.{timestamp}.nc'
                forecastFilename = f'preassim_{aggregation.rjust(4, "0")}.{timestamp}.nc'

            analysisData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, analysisFilename))
            forecastData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, forecastFilename))

            hydrographData['data'].append({
                'timestamp': timestamp,
                'forecast': float(forecastData.variables[stateVariable][linkID].item()),
                'analysis': float(analysisData.variables[stateVariable][linkID].item())
            })

        hydrographData['lon'] = float(self.rl.lon[linkID])
        hydrographData['lat'] = float(self.rl.lat[linkID])

        return hydrographData
    
    def getHydrographInflationData(self, linkID, stateVariable, inflation):
        hydrographData = {}
        hydrographData['linkID'] = linkID

        hydrographData['data'] = []

        for timestamp in self.timestamps:
            analysisFilename = f'analysis_{inflation}_mean.{timestamp}.nc'
            forecastFilename = f'preassim_{inflation}_mean.{timestamp}.nc'

            analysisData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, analysisFilename))
            forecastData = nc.Dataset(os.path.join(self.modelFilesPath, timestamp, forecastFilename))

            hydrographData['data'].append({
                'timestamp': timestamp,
                'analysis': float(analysisData.variables[stateVariable][linkID].item()),
                'forecast': float(forecastData.variables[stateVariable][linkID].item())
            })

        hydrographData['lon'] = float(self.rl.lon[linkID])
        hydrographData['lat'] = float(self.rl.lat[linkID])

        return hydrographData


if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="HydroVis - Visual Analysis Tool for DART Forecasting of Hydro Models")
    parser.add_argument('-f', '--modelFilesPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)

    args = parser.parse_args()
    rlData = RouteLinkData(args.routeLinkFilePath)
    ensemble = Ensemble(args.modelFilesPath, rlData)
    observations = Observations(args.modelFilesPath, ensemble.timestamps)
    
    @app.route('/', methods=['GET'])
    def index():
        return render_template('index.html')
        
    @app.route('/getStateData', methods=['POST'])
    def getStateData():
        if request.method == 'POST':
            query = json.loads(request.data)
            timestamp = query['timestamp']
            aggregation = query['aggregation']
            daStage = query['daStage']
            stateVariable = query['stateVariable']
            inflation = None if query['inflation'] == 'none' else query['inflation']

            stateData = ensemble.getStateData(timestamp, aggregation, daStage, stateVariable, inflation)
            return json.dumps(stateData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getUIParameters', methods=['GET'])
    def getUIParameters():
        if request.method == 'GET':
            return json.dumps(ensemble.getUIParameters())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getTimestamps', methods=['GET'])
    def getTimestamps():
        if request.method == 'GET':
            return json.dumps(ensemble.getTimestamps())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getLonLatBoundingBox', methods=['GET'])
    def getLonLatBoundingBox():
        if request.method == 'GET':
            return json.dumps(rlData.getDataBoundingBoxLonLat())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getEnsembleData', methods=['POST'])
    def getEnsembleData():
        if request.method == 'POST':
            query = json.loads(request.data)
            timestamp = query['timestamp']
            stateVariable = query['stateVariable']
            linkID = query['linkID']

            ensembleData = ensemble.getEnsembleData(timestamp, stateVariable, linkID)
            return json.dumps(ensembleData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getHydrographStateVariableData', methods=['POST'])
    def getHydrographStateVariableData():
        if request.method == 'POST':
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            aggregation = query['aggregation']
            readFromGaugeLocation = query['readFromGaugeLocation']

            if readFromGaugeLocation and stateVariable == 'qlink1':
                hydrographData = observations.getHydrographStateVariableData(linkID, aggregation)
            else:
                hydrographData = ensemble.getHydrographStateVariableData(linkID, aggregation, stateVariable)
            
            return json.dumps(hydrographData)
        else:
            print('Expected POST method, but received ' + request.method)

    @app.route('/getGaugeLocations', methods=['GET'])
    def getGaugeLocations():
        if request.method == 'GET':
            return json.dumps(observations.getGaugeLocations())
        else:
            print('Expected GET method, but received ' + request.method)

    @app.route('/getHydrographInflationData', methods=['POST'])
    def getHydrographInflationData():
        if request.method == 'POST':
            query = json.loads(request.data)
            linkID = query['linkID']
            stateVariable = query['stateVariable']
            inflation = query['inflation']

            hydrographData = ensemble.getHydrographInflationData(linkID, stateVariable, inflation)
            return json.dumps(hydrographData)
        else:
            print('Expected POST method, but received ' + request.method)


    app.run(host='127.0.0.1', port=8000, debug=True, use_evalex=False, use_reloader=True)
