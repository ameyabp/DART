import netCDF4 as nc
import xarray as xr
import os
import numpy as np

from .helper import obs_seq_to_netcdf_wrapper
from .helper import daPhaseCoords, aggregationCoords

# Class definition for parsing observation data
# and creating xarray dataArray data structure from it

class ObservationData:
    def __init__(self, modelFilesPath, timestampList, xrDataset):
        self.timestampList = timestampList
        self.modelFilesPath = modelFilesPath
        self.xrDataset = xrDataset
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

        ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', self.timestampList[0], f'obs_seq.final.{self.timestampList[0]}.nc'))
        self.linkIDCoords = np.unique(-1 * ncData.variables['obs_type'][:])

        self.observation_gauge_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), len(self.timestampList))),#, len(daPhaseCoords), len(aggregationCoords))), 
            coords={'linkID': self.linkIDCoords, 'time': self.timestampList},#, 'daPhase':daPhaseCoords, 'aggregation':aggregationCoords}, 
            dims=['linkID', 'time'],#, 'daPhase', 'aggregation'], 
            name='observation_gauge_data'
        )

        self.observation_gauge_location_data = xr.DataArray(
            data=np.ndarray((len(self.linkIDCoords), 2)),
            coords={'linkID': self.linkIDCoords, 'location': ['lon', 'lat']},
            dims=['linkID', 'location'],
            name='observation_gauge_locations'
        )

        for timestamp in self.timestampList:
            ncData = nc.Dataset(os.path.join(self.modelFilesPath, 'output', timestamp, f'obs_seq.final.{timestamp}.nc'))

            for linkID in np.unique(ncData.variables['obs_type']):
                linkIDIndexes = np.where(ncData.variables['obs_type'][:] == linkID)[0]
                self.observation_gauge_data.loc[dict(linkID=-linkID, time=timestamp)] = np.average(ncData.variables['observations'][linkIDIndexes,0])

        for linkID in np.unique(ncData.variables['obs_type']):
            linkIDIndex = np.where(ncData.variables['obs_type'][:] == linkID)[0][0]
            self.observation_gauge_location_data.loc[dict(linkID=-linkID, location=['lon', 'lat'])] = ncData.variables['location'][linkIDIndex, :2]

        self.xrDataset = self.xrDataset.assign(variables={
            'observation_gauge_data': self.observation_gauge_data,
            'observation_gauge_locations': self.observation_gauge_location_data
        })

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

    def getObservationGaugeLocationData(self):
        gaugeLocationData = []

        for linkID in self.observation_gauge_location_data.coords['linkID']:
            location = self.observation_gauge_location_data.sel(linkID=linkID)
            gaugeLocationData.append({
                'linkID': linkID,
                'location': [
                    location[0].item(),
                    location[1].item(),
                ]
            })

        return gaugeLocationData
    
    def getObservationDataForHydrograph(self, linkID, aggregation):
        renderData = {
            'linkID': linkID,
            'data': []
        }

        for timestamp in self.timestampList:
            dataPoint = {
                'timestamp': timestamp,
                'observation': self.observation_gauge_data.sel(linkID=linkID, time=timestamp).item()
            }

            renderData.data.append(dataPoint)

        return renderData