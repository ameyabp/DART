import os
import json
import math
import argparse
import numpy as np
import netCDF4 as nc
from flask import Flask, render_template, request

from webServer.helper import obs_seq_to_netcdf_wrapper

app = Flask('hydroVis')

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

class ObservationData:
    def __init__(self, modelFilesPath, timestampList):
        self.timestampList = timestampList
        self.modelFilesPath = modelFilesPath
        
        # convert obs_seq file to netcdf format
        obs_seq_to_netcdf_wrapper(self.modelFilesPath)

        self.observedLinkLocations = {}
        self.observedLinkDataIndexes = {}

        obs_seq = nc.Dataset(os.path.join(self.modelFilesPath, 'output', self.timestampList[0], f'obs_seq.final.{self.timestampList[0]}.nc'))
        for idx, linkID in enumerate(obs_seq.variables['obs_type'][:]):
            location = [
                float(obs_seq.variables['location'][idx][0]),
                float(obs_seq.variables['location'][idx][1])
            ]
            assert (-linkID not in self.observedLinkLocations) or (self.observedLinkLocations[-linkID] == location)
            # multiple observations may exist for each location, thus check the assert condition for sanity
            self.observedLinkLocations[-linkID] = location
            
            if -linkID not in self.observedLinkDataIndexes:
                self.observedLinkDataIndexes[-linkID] = []
            self.observedLinkDataIndexes[-linkID].append(idx)

    def getHydrographStateVariableData(self, linkID, aggregation):
        hydrographData = {}
        hydrographData['linkID'] = linkID
        
        if aggregation == 'mean' or aggregation == 'sd':
            hydrographData['agg'] = aggregation

        else:
            hydrographData['agg'] = int(aggregation)

        hydrographData['data'] = []

        assert linkID in self.observedLinkLocations
        for timestamp in self.timestampList:
            obs_seq = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'obs_seq.final.{timestamp}.nc'))

            dataIndexID = self.observedLinkDataIndexes[linkID]

            data = {}
            data['timestamp'] = timestamp
            averagedLinkData = np.average(obs_seq.variables['observations'][dataIndexID], axis=0)
            data['observation'] = averagedLinkData[0].item()

            if aggregation == 'mean':
                data['forecast'] = averagedLinkData[1].item()
                data['analysis'] = averagedLinkData[2].item()
                data['forecastSdMin'] = averagedLinkData[1].item() - averagedLinkData[3].item()
                data['forecastSdMax'] = averagedLinkData[1].item() + averagedLinkData[3].item()
                data['analysisSdMin'] = averagedLinkData[2].item() - averagedLinkData[4].item()
                data['analysisSdMax'] = averagedLinkData[2].item() + averagedLinkData[4].item()

            elif aggregation == 'sd':
                data['forecast'] = averagedLinkData[3].item()
                data['analysis'] = averagedLinkData[4].item()
                data['forecastSdMin'] = averagedLinkData[3].item()
                data['forecastSdMax'] = averagedLinkData[4].item()
                data['analysisSdMin'] = averagedLinkData[3].item()
                data['analysisSdMax'] = averagedLinkData[4].item()

            else:
                data['forecast'] = averagedLinkData[4 + 2 * (aggregation - 1)].item() 
                data['analysis'] = averagedLinkData[4 + 2 * (aggregation - 1) + 1].item()
                data['forecastSdMin'] = averagedLinkData[1].item() - averagedLinkData[3].item()
                data['forecastSdMax'] = averagedLinkData[1].item() + averagedLinkData[3].item()
                data['analysisSdMin'] = averagedLinkData[2].item() - averagedLinkData[4].item()
                data['analysisSdMax'] = averagedLinkData[2].item() + averagedLinkData[4].item()

            hydrographData['data'].append(data)

        return hydrographData

    def getGaugeLocations(self):
        gaugeLocationData = []

        for linkID in self.observedLinkLocations:
            gaugeLocationData.append({
                'linkID': int(linkID),
                'location': self.observedLinkLocations[linkID]
            })

        return gaugeLocationData
    
class AssimilationData:
    def __init__(self, modelFilesPath, rlData):
        # list of timestamps for the ensemble models 
        self.modelFilesPath = modelFilesPath
        self.timestamps = [f for f in os.listdir(os.path.join(self.modelFilesPath, 'output')) if os.path.isdir(os.path.join(self.modelFilesPath, 'output', f))]
        self.timestamps.sort()
        
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(self.modelFilesPath, 'output', self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = int(len(netcdfFiles)/4)

        # gathering meta data
        self.sampleOutputData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', self.timestamps[0], netcdfFiles[0]))
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
        # for map visualization
        print(timestamp, aggregation, daStage, stateVariable, inflation)

        # construct required netcdf file name
        if daStage == 'increment':
            analysisFilename = f'analysis_mean.{timestamp}.nc'
            forecastFilename = f'preassim_mean.{timestamp}.nc'

            analysisData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisFilename))
            forecastData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastFilename))
            assert(self.rl.numLinks == len(analysisData.variables[self.stateVariables[0]][:]))
            assert(self.rl.numLinks == len(forecastData.variables[self.stateVariables[0]][:]))

        elif aggregation == 'mean' or aggregation == 'sd':
            if inflation:
                filename = f'{daStage}_{inflation}_{aggregation}.{timestamp}.nc'
            else:
                filename = f'{daStage}_{aggregation}.{timestamp}.nc'

            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, filename))
            assert(self.rl.numLinks == len(ncData.variables[self.stateVariables[0]][:]))

        else:
            filename = f'{daStage}_member_{str(aggregation).rjust(4, "0")}.{timestamp}.nc'

            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, filename))
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

                if daStage == 'increment':
                    dataPoint[stateVariable] = float(analysisData.variables[stateVariable][linkID].item()) - float(forecastData.variables[stateVariable][linkID].item())
                else:
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
        # for distribution plots
        ensembleData = []

        # construct required netcdf file name
        for id in range(self.numEnsembleModels):
            memberID = str(id+1).rjust(4, '0')
            analysisFilename = f'analysis_member_{memberID}.{timestamp}.nc'
            forecastFilename = f'preassim_member_{memberID}.{timestamp}.nc'

            memberAnalysisData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisFilename))
            memberForecastData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastFilename))

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
        # for state variable hydrograph plot

        hydrographData = {}
        hydrographData['linkID'] = linkID

        if aggregation == 'mean' or aggregation =='sd':
            hydrographData['agg'] = aggregation
        else:
            hydrographData['agg'] = int(aggregation)

        hydrographData['data'] = []
    
        for timestamp in self.timestamps:
            analysisSdFilename = f'analysis_sd.{timestamp}.nc'
            forecastSdFilename = f'preassim_sd.{timestamp}.nc'

            analysisSdData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisSdFilename))
            forecastSdData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastSdFilename))

            if aggregation != 'sd':
                analysisMeanFilename = f'analysis_mean.{timestamp}.nc'
                forecastMeanFilename = f'preassim_mean.{timestamp}.nc'

                analysisMeanData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisMeanFilename))
                forecastMeanData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastMeanFilename))

                if aggregation != 'mean':
                    analysisMemberFilename = f'analysis_member_{str(aggregation).rjust(4, "0")}.{timestamp}.nc'
                    forecastMemberFilename = f'preassim_member_{str(aggregation).rjust(4, "0")}.{timestamp}.nc'

                    analysisMemberData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisMemberFilename))
                    forecastMemberData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastMemberFilename))

            if aggregation == 'mean':
                hydrographData['data'].append({
                    'timestamp': timestamp,
                    'forecast': float(forecastMeanData.variables[stateVariable][linkID].item()),
                    'analysis': float(analysisMeanData.variables[stateVariable][linkID].item()),
                    'forecastSdMax': float(forecastMeanData.variables[stateVariable][linkID].item()) + float(forecastSdData.variables[stateVariable][linkID].item()),
                    'forecastSdMin': float(forecastMeanData.variables[stateVariable][linkID].item()) - float(forecastSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMax': float(analysisMeanData.variables[stateVariable][linkID].item()) + float(analysisSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMin': float(analysisMeanData.variables[stateVariable][linkID].item()) - float(analysisSdData.variables[stateVariable][linkID].item())
                })
            
            elif aggregation == 'sd':
                hydrographData['data'].append({
                    'timestamp': timestamp,
                    'forecast': float(forecastSdData.variables[stateVariable][linkID].item()),
                    'analysis': float(analysisSdData.variables[stateVariable][linkID].item()),
                    'forecastSdMax': float(forecastSdData.variables[stateVariable][linkID].item()),
                    'forecastSdMin': float(forecastSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMax': float(analysisSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMin': float(analysisSdData.variables[stateVariable][linkID].item())
                })

            else: # aggregation == 'member'
                hydrographData['data'].append({
                    'timestamp': timestamp,
                    'forecast': float(forecastMemberData.variables[stateVariable][linkID].item()),
                    'analysis': float(analysisMemberData.variables[stateVariable][linkID].item()),
                    'forecastSdMax': float(forecastMeanData.variables[stateVariable][linkID].item()) + float(forecastSdData.variables[stateVariable][linkID].item()),
                    'forecastSdMin': float(forecastMeanData.variables[stateVariable][linkID].item()) - float(forecastSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMax': float(analysisMeanData.variables[stateVariable][linkID].item()) + float(analysisSdData.variables[stateVariable][linkID].item()),
                    'analysisSdMin': float(analysisMeanData.variables[stateVariable][linkID].item()) - float(analysisSdData.variables[stateVariable][linkID].item())
                })

        hydrographData['lon'] = float(self.rl.lon[linkID])
        hydrographData['lat'] = float(self.rl.lat[linkID])

        return hydrographData
    
    def getHydrographInflationData(self, linkID, stateVariable, inflation):
        # for inflation hydrograph plot

        hydrographData = {}
        hydrographData['linkID'] = linkID

        hydrographData['data'] = []

        for timestamp in self.timestamps:
            analysisFilename = f'analysis_{inflation}_mean.{timestamp}.nc'
            forecastFilename = f'preassim_{inflation}_mean.{timestamp}.nc'

            analysisData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, analysisFilename))
            forecastData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, forecastFilename))

            hydrographData['data'].append({
                'timestamp': timestamp,
                'analysis': float(analysisData.variables[stateVariable][linkID].item()),
                'forecast': float(forecastData.variables[stateVariable][linkID].item())
            })

        hydrographData['lon'] = float(self.rl.lon[linkID])
        hydrographData['lat'] = float(self.rl.lat[linkID])

        return hydrographData

class OpenLoopData:
    def __init__(self, dataFilesPath, timestamps):
        self.dataFilesPath = dataFilesPath

if __name__=='__main__':
    parser = argparse.ArgumentParser(prog="HydroVis - Visual Analysis Tool for DART Forecasting of Hydro Models")
    parser.add_argument('-da', '--daDataPath', required=True)
    parser.add_argument('-ol', '--openLoopDataPath', required=True)
    parser.add_argument('-rl', '--routeLinkFilePath', required=True)
    parser.add_argument('-p', '--portNum', type=int, default=8000)

    args = parser.parse_args()
    rlData = RouteLinkData(args.routeLinkFilePath)
    ensemble = AssimilationData(args.daDataPath, rlData)
    observations = ObservationData(args.daDataPath, ensemble.timestamps)
    openLoop = OpenLoopData(args.openLoopDataPath, ensemble.timestamps)
    
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

    app.run(host='127.0.0.1', port=args.portNum, debug=True, use_evalex=False, use_reloader=True)
