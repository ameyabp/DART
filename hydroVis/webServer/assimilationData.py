import os
import netCDF4 as nc
import xarray as xr
import numpy as np

# Class definition for parsing the assimilated data files
# and creating xarray dataArray data structure from it

class AssimilationData:
    def __init__(self, modelFilesPath, rlData, datacube, createXarrayFromScratch):
        # list of timestamps for the ensemble models 
        self.modelFilesPath = modelFilesPath
        self.timestamps = [f for f in os.listdir(os.path.join(self.modelFilesPath, 'output')) if os.path.isdir(os.path.join(self.modelFilesPath, 'output', f))]
        self.timestamps.sort()
        self.timestamps = self.timestamps[:3]
        
        # number of models in the ensemble
        netcdfFiles = [f for f in os.listdir(os.path.join(self.modelFilesPath, 'output', self.timestamps[0])) if 'member' in f]
        self.numEnsembleModels = int(len(netcdfFiles)/4)

        # gathering meta data
        self.sampleOutputData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', self.timestamps[0], netcdfFiles[0]))
        self.stateVariables = list(self.sampleOutputData.variables.keys())
        self.stateVariables.remove('time')

        # routeLink data
        self.rl = rlData

        self.linkIDCoords = self.rl.linkIDCoords
        self.timeCoords = self.timestamps
        self.stateVariableDaPhaseCoords = ['preassim', 'analysis', 'openloop']
        self.stateVariableAggregationCoords = ['mean', 'sd'] + list(range(1, self.numEnsembleModels+1, 1))
        self.inflationDaPhaseCoords = ['preassim', 'analysis']

        if not createXarrayFromScratch and os.path.exists(os.path.join('datacube', 'qlink1_data.nc')) and \
            os.path.exists(os.path.join('datacube', 'z_gwsubbas_data.nc')) and \
            os.path.exists(os.path.join('datacube', 'qlink1_priorinf.nc')) and \
            os.path.exists(os.path.join('datacube', 'z_gwsubbas_postinf.nc')) and \
            os.path.exists(os.path.join('datacube', 'qlink1_postinf.nc')) and \
            os.path.exists(os.path.join('datacube', 'z_gwsubbas_postinf.nc')):

            self.qlink1_data = xr.open_dataarray(os.path.join('datacube', 'qlink1_data.nc'))
            self.z_gwsubbas_data = xr.open_dataarray(os.path.join('datacube', 'z_gwsubbas_data.nc'))
            self.qlink1_priorinf = xr.open_dataarray(os.path.join('datacube', 'qlink1_priorinf.nc'))
            self.z_gwsubbas_priorinf = xr.open_dataarray(os.path.join('datacube', 'z_gwsubbas_priorinf.nc'))
            self.qlink1_postinf = xr.open_dataarray(os.path.join('datacube', 'qlink1_postinf.nc'))
            self.z_gwsubbas_postinf = xr.open_dataarray(os.path.join('datacube', 'z_gwsubbas_postinf.nc'))

        else:
            self.qlink1_data = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.stateVariableDaPhaseCoords), len(self.stateVariableAggregationCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.stateVariableDaPhaseCoords, 'aggregation':self.stateVariableAggregationCoords},
                dims=['linkID', 'time', 'daPhase', 'aggregation'], 
                name='qlink1_data'
            )

            self.z_gwsubbas_data = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.stateVariableDaPhaseCoords), len(self.stateVariableAggregationCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.stateVariableDaPhaseCoords, 'aggregation':self.stateVariableAggregationCoords},
                dims=['linkID', 'time', 'daPhase', 'aggregation'], 
                name='z_gwsubbas_data'
            )

            self.qlink1_priorinf = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.inflationDaPhaseCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.inflationDaPhaseCoords}, 
                dims=['linkID', 'time', 'daPhase'], 
                name='qlink1_priorinf'
            )

            self.z_gwsubbas_priorinf = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.inflationDaPhaseCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.inflationDaPhaseCoords}, 
                dims=['linkID', 'time', 'daPhase'], 
                name='z_gwsubbas_priorinf'
            )

            self.qlink1_postinf = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.inflationDaPhaseCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.inflationDaPhaseCoords}, 
                dims=['linkID', 'time', 'daPhase'], 
                name='qlink1_postinf'
            )

            self.z_gwsubbas_postinf = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(self.timeCoords), len(self.inflationDaPhaseCoords))), 
                coords={'linkID':self.linkIDCoords, 'time':self.timeCoords, 'daPhase':self.inflationDaPhaseCoords},
                dims=['linkID', 'time', 'daPhase'], 
                name='z_gwsubbas_postinf'
            )

            for timestamp in self.timestamps:
                # FORECAST
                # mean
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_mean.{timestamp}.nc'))
                self.qlink1_data.loc[dict(time=timestamp, daPhase='preassim', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='preassim', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]
                
                # stdev
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_sd.{timestamp}.nc'))
                self.qlink1_data.loc[dict(time=timestamp, daPhase='preassim', aggregation='sd')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='preassim', aggregation='sd')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # member
                for member in range(1, self.numEnsembleModels+1):
                    ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_member_{str(member).rjust(4, "0")}.{timestamp}.nc'))
                    self.qlink1_data.loc[dict(time=timestamp, daPhase='preassim', aggregation=str(member))] = ncData.variables['qlink1'][self.linkIDCoords-1]
                    self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='preassim', aggregation=str(member))] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # prior_inflation
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_priorinf_mean.{timestamp}.nc'))
                self.qlink1_priorinf.loc[dict(time=timestamp, daPhase='preassim')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_priorinf.loc[dict(time=timestamp, daPhase='preassim')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # post_inflation
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_postinf_mean.{timestamp}.nc'))
                self.qlink1_postinf.loc[dict(time=timestamp, daPhase='preassim')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_postinf.loc[dict(time=timestamp, daPhase='preassim')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # ANALYSIS
                # mean
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_mean.{timestamp}.nc'))
                self.qlink1_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]
                
                # stdev
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_sd.{timestamp}.nc'))
                self.qlink1_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='sd')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='sd')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # member
                for member in range(1, self.numEnsembleModels+1):
                    ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_member_{str(member).rjust(4, "0")}.{timestamp}.nc'))
                    self.qlink1_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=str(member))] = ncData.variables['qlink1'][self.linkIDCoords-1]
                    self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=str(member))] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # prior_inflation mean
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_priorinf_mean.{timestamp}.nc'))
                self.qlink1_priorinf.loc[dict(time=timestamp, daPhase='analysis')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_priorinf.loc[dict(time=timestamp, daPhase='analysis')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                # post_inflation mean
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_postinf_mean.{timestamp}.nc'))
                self.qlink1_postinf.loc[dict(time=timestamp, daPhase='analysis')] = ncData.variables['qlink1'][self.linkIDCoords-1]
                self.z_gwsubbas_postinf.loc[dict(time=timestamp, daPhase='analysis')] = ncData.variables['z_gwsubbas'][self.linkIDCoords-1]

                print("Loaded timestamp", timestamp)

        datacube.addDataArray('qlink1_data', self.qlink1_data)
        datacube.addDataArray('z_gwsubbas_data', self.z_gwsubbas_data)
        datacube.addDataArray('qlink1_priorinf', self.qlink1_priorinf)
        datacube.addDataArray('z_gwsubbas_priorinf', self.z_gwsubbas_priorinf)
        datacube.addDataArray('qlink1_postinf', self.qlink1_postinf)
        datacube.addDataArray('z_gwsubbas_postinf', self.z_gwsubbas_postinf)

    def getUIParameters(self):
        return {
            'stateVariables': self.stateVariables,
            'numEnsembleModels': self.numEnsembleModels,
            'timestamps': self.timestamps
        }
    
    def getTimestamps(self):
        return self.timestamps

    # netcdf file access

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
            # it should have been
            # linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]: self.rl.fromIndsEnd[i]+1]
            # but the netcdf files were written using 1-based indexes for fromIndsStart, fromIndsEnd and fromIndices
            # therefore to make it work with python's netCDF library, we do a '-1' for each of the three array accesses
            assert (self.rl.numUpLinks[i] == len(linkIndices))

            for linkID in linkIndices:
                dataPoint = {}
                dataPoint['linkID'] = int(linkID)+1
                # to be consistent with the way the data was written in the original netCDF files (1-based index)
                # change from python netCDF library's 0-based index to 1-based index with a '+1'
                # only for storing the linkID, not for accessing the lat and lon arrays

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

        return ensembleData

        # return {
        #     'lon': float(self.rl.lon[linkID]),
        #     'lat': float(self.rl.lat[linkID]),
        #     'ensembleData': ensembleData
        # }

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

    # xarray access

    def getMapData(self, datacube, timestamp, aggregation, daStage, stateVariable, inflation=None):
        # for map visualization
        print(timestamp, aggregation, daStage, stateVariable, inflation)
        
        if inflation:
            dataArrayKey = f'{stateVariable}_{inflation}'
            dataArray = datacube.getDataArray(dataArrayKey).sel(time=timestamp, daPhase=daStage)
        else:
            dataArrayKey = f'{stateVariable}_data'
            if daStage == 'increment':
                dataArray = datacube.getDataArray(dataArrayKey).sel(time=timestamp, daPhase='analysis', aggregation=str(aggregation)) - \
                            datacube.getDataArray(dataArrayKey).sel(time=timestamp, daPhase='preassim', aggregation=str(aggregation))
            else:
                dataArray = datacube.getDataArray(dataArrayKey).sel(time=timestamp, daPhase=daStage, aggregation=str(aggregation))

        # TODO: Check for converting array data to json using vectorized functions
        renderData = [
            {
                'linkID': lid.item(),
                stateVariable: dataArray.sel(linkID=lid).item()
            }
            for lid in dataArray.coords['linkID']
        ]

        return renderData
    
    def getDistributionData(self, datacube, timestamp, stateVariable, linkID):
        dataArrayKey = f'{stateVariable}_data'
        dataArray = datacube.getDataArray(dataArrayKey).sel(linkID=linkID, time=timestamp, aggregation=[str(memberID) for memberID in range(1, self.numEnsembleModels, 1)])

        # TODO: Check for converting array data to json using vectorized functions
        renderData = [
            {
                'memberID': memberID,
                stateVariable: {
                    'analysis': dataArray.sel(aggregation=str(memberID), daPhase='analysis').item(),
                    'forecast': dataArray.sel(aggregation=str(memberID), daPhase='preassim').item()
                }
            }
            for memberID in range(1, self.numEnsembleModels, 1)
        ]

        return renderData
    
    def getStateVariableHydrographData(self, datacube, linkID, aggregation, stateVariable):
        dataArrayKey = f'{stateVariable}_data'
        dataArray = datacube.getDataArray(dataArrayKey).sel(linkID=linkID)
        
        # TODO: Check for converting array data to json using vectorized functions
        renderData = {
            'linkID': linkID,
            'aggregation': aggregation,
            'data': []
        }
        for timestamp in self.timestamps:
            dataPoint = {}

            dataPoint['timestamp'] = timestamp
            dataPoint['forecast'] = dataArray.sel(time=timestamp, daPhase='preassim', aggregation=str(aggregation)).item()
            dataPoint['analysis'] = dataArray.sel(time=timestamp, daPhase='analysis', aggregation=str(aggregation)).item()
            dataPoint['openloop'] = dataArray.sel(time=timestamp, daPhase='openloop', aggregation=str(aggregation)).item()
            # print(dataPoint['openloop'])
            
            obs_dataArray = datacube.getDataArray('observation_gauge_data').sel(time=timestamp)
            # print(linkID, obs_dataArray.coords['linkID'])
            dataPoint['gaugeDataAvailable'] = (stateVariable == 'qlink1' and aggregation != 'sd' and (linkID in obs_dataArray.coords['linkID']))
            # print(dataPoint['gaugeDataAvailable'], dataPoint['gaugeDataAvailable'] == True)
            if dataPoint['gaugeDataAvailable']:
                # print("inside ", obs_dataArray.sel(linkID=linkID).item())
                dataPoint['observation'] = obs_dataArray.sel(linkID=linkID).item()
            else:
                dataPoint['observation'] = 0
            # print("outside ", dataPoint['observation'])
            
            if aggregation == 'sd':
                dataPoint['forecastSdMax'] = dataArray.sel(time=timestamp, daPhase='preassim', aggregation='sd').item()
                dataPoint['forecastSdMin'] = dataArray.sel(time=timestamp, daPhase='preassim', aggregation='sd').item()
                dataPoint['analysisSdMax'] = dataArray.sel(time=timestamp, daPhase='analysis', aggregation='sd').item()
                dataPoint['analysisSdMin'] = dataArray.sel(time=timestamp, daPhase='analysis', aggregation='sd').item()
                dataPoint['openloopSdMax'] = dataArray.sel(time=timestamp, daPhase='openloop', aggregation='sd').item()
                dataPoint['openloopSdMin'] = dataArray.sel(time=timestamp, daPhase='openloop', aggregation='sd').item()

            else:
                dataPoint['forecastSdMax'] = (dataArray.sel(time=timestamp, daPhase='preassim', aggregation='mean') + dataArray.sel(time=timestamp, daPhase='preassim', aggregation='sd')).item()
                dataPoint['forecastSdMin'] = (dataArray.sel(time=timestamp, daPhase='preassim', aggregation='mean') - dataArray.sel(time=timestamp, daPhase='preassim', aggregation='sd')).item()
                dataPoint['analysisSdMax'] = (dataArray.sel(time=timestamp, daPhase='analysis', aggregation='mean') + dataArray.sel(time=timestamp, daPhase='analysis', aggregation='sd')).item()
                dataPoint['analysisSdMin'] = (dataArray.sel(time=timestamp, daPhase='analysis', aggregation='mean') - dataArray.sel(time=timestamp, daPhase='analysis', aggregation='sd')).item()
                dataPoint['openloopSdMax'] = (dataArray.sel(time=timestamp, daPhase='openloop', aggregation='mean') + dataArray.sel(time=timestamp, daPhase='openloop', aggregation='sd')).item()
                dataPoint['openloopSdMin'] = (dataArray.sel(time=timestamp, daPhase='openloop', aggregation='mean') - dataArray.sel(time=timestamp, daPhase='openloop', aggregation='sd')).item()

            renderData['data'].append(dataPoint)

        return renderData
    
    def getInflationHydrographData(self, datacube, linkID, stateVariable, inflation):
        dataArrayKey = f'{stateVariable}_{inflation}'
        dataArray = datacube.getDataArray(dataArrayKey).sel(linkID=linkID)

        # TODO: Check for converting array data to json using vectorized functions
        renderData = {
            'linkID': linkID,
            'data': []
        }
        for timestamp in self.timestamps:
            dataPoint = {}

            dataPoint['timestamp'] = timestamp
            dataPoint['forecast'] = dataArray.sel(time=timestamp, daPhase='preassim').item()
            dataPoint['analysis'] = dataArray.sel(time=timestamp, daPhase='analysis').item()

            renderData['data'].append(dataPoint)

        return renderData