import netCDF4 as nc
import xarray as xr
import os
import numpy as np

from webServer.helper import obs_seq_to_netcdf_wrapper

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
