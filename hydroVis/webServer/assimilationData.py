import os
import netCDF4 as nc
import xarray as xr
import numpy as np

from .helper import daPhaseCoords, aggregationCoords

# Class definition for parsing the assimilated data files
# and creating xarray dataArray data structure from it

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

        self.linkIDCoords = self.rl.fromIndices
        timeCoords = self.timestamps
        aggCoords = aggregationCoords.extend(list(range(1, self.numEnsembleModels+1, 1)))

        self.qlink_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='qlink1'
        )

        self.z_gwsubbas_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='z_gwsubbas'
        )

        self.qlink1_priorinf_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='qlink1_prior_inflation'
        )

        self.z_gwsubbas_priorinf_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='z_gwsubbas_prior_inflation'
        )

        self.qlink1_postinf_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='qlink1_posterior_inflation'
        )

        self.z_gwsubbas_postinf_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(timeCoords), len(daPhaseCoords), len(aggCoords))), 
            coords={'linkID':self.linkIDCoords, 'time':timeCoords, 'daPhase':daPhaseCoords, 'aggregation':aggCoords}, 
            dims=['linkID', 'time', 'daPhase', 'aggregation'], 
            name='z_gwsubbas_posterior_inflation'
        )

        for timestamp in self.timestamps:
            # FORECAST
            # mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_mean.{timestamp}.nc'))
            self.qlink_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]
            
            # stdev
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_sd.{timestamp}.nc'))
            self.qlink_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='sd')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='sd')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # member
            for member in range(1, self.numEnsembleModels+1):
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_member_{str(member).rjust(4, "0")}.{timestamp}.nc'))
                self.qlink_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=member)] = ncData.variables['qlink1'][self.linkIDCoords]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=member)] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # prior_inflation mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_priorinf_mean.{timestamp}.nc'))
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # prior_inflation stdev
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='stdev')] = 0
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='stdev')] = 0

            # prior_inflation member
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0

            # post_inflation mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'preassim_postinf_mean.{timestamp}.nc'))
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # post_inflation stdev
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='stdev')] = 0
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation='stdev')] = 0

            # post_inflation member
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='forecast', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0

            # ANALYSIS
            # mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_mean.{timestamp}.nc'))
            self.qlink_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]
            
            # stdev
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_sd.{timestamp}.nc'))
            self.qlink_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='sd')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='sd')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # member
            for member in range(1, self.numEnsembleModels+1):
                ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_member_{str(member).rjust(4, "0")}.{timestamp}.nc'))
                self.qlink_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=member)] = ncData.variables['qlink1'][self.linkIDCoords]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=member)] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # prior_inflation mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_priorinf_mean.{timestamp}.nc'))
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # prior_inflation stdev
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='stdev')] = 0
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='stdev')] = 0

            # prior_inflation member
            self.qlink1_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0
            self.z_gwsubbas_priorinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0

            # post_inflation mean
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'analysis_postinf_mean.{timestamp}.nc'))
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            # post_inflation stdev
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='stdev')] = 0
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation='stdev')] = 0

            # post_inflation member
            self.qlink1_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0
            self.z_gwsubbas_postinf_data.loc[dict(time=timestamp, daPhase='analysis', aggregation=list(range(1, self.numEnsembleModels+1, 1)))] = 0

            # increment
            # qlink1 mean
            # qlink1 stdev
            # qlink1 member
            # z_gwsubbas mean
            # z_gwsubbas stdev
            # z_gwsubbas member
            # prior_inflation mean
            # prior_inflation stdev
            # prior_inflation member
            # post_inflation mean
            # post_inflation stdev
            # post_inflation member

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
            # it should have been
            # linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]: self.rl.fromIndsEnd[i]+1]-1
            # but the netcdf files were written using 1-based indexes for fromIndsStart, fromIndsEnd and fromIndices
            # therefore to make it work with python's netCDF library, we do a '-1' for each of the three array accesses
            assert (self.rl.numUpLinks[i] == len(linkIndices))

            for linkID in linkIndices:
                dataPoint = {}
                dataPoint['linkID'] = int(linkID)+1
                # to be consistent with the way the data was written in the original netCDF files (1-based index)
                # change from python netCDF library's 0-based index to 1-based index with a '+1'

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

    # def getMapData(self, timestamp, aggregation, daStage, stateVariable, inflation=None):
    #     if stateVariable == 'qlink1':
    #         if inflation == 'priorinf':
    #             xarrayData = self.qlink1_
    #         elif inflation == 'postinf':
    #         else:

    #     else:
    #         if inflation == 'priorinf':
    #         elif inflation == 'postinf':
    #         else: