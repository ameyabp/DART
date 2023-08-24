import netCDF4 as nc
import os

# Class definition for parsing openloop data
# and creating xarray dataArray data structure from it

class OpenLoopData:
    def __init__(self, dataFilesPath, timestampList, numEnsembleModels, rlData, xrDataset):
        self.dataFilesPath = dataFilesPath
        self.timestampList = timestampList
        self.numEnsembleModels = numEnsembleModels
        self.rlData = rlData
        self.xrDataset = xrDataset

        self.linkIDCoords = self.rlData.fromIndices

        self.qlink1_data = self.xrDataset['qlink1_data']
        self.z_gwsubbas_data = self.xrDataset['z_gwsubbas_data']

        for timestamp in self.timestampList:
            ncData = nc.Dataset(os.path.join(dataFilesPath, 'output', timestamp, f'preassim_mean.{timestamp}.nc'))
            self.qlink1_data.loc[dict(time=timestamp, daPhase='openloop', aggregation='mean')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='openloop', aggregation='mean')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

            ncData = nc.Dataset(os.path.join(dataFilesPath, 'output', timestamp, f'preassim_sd.{timestamp}.nc'))
            self.qlink1_data.loc[dict(time=timestamp, daPhase='openloop', aggregation='sd')] = ncData.variables['qlink1'][self.linkIDCoords]
            self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='openloop', aggregation='sd')] = ncData.variables['z_gwsubbas'][self.linkIDCoords]
            
            for memberID in range(1, numEnsembleModels+1, 1):
                ncData = nc.Dataset(os.path.join(dataFilesPath, 'output', timestamp, f'preassim_member_{str(memberID).rjust(4, "0")}.{timestamp}.nc'))
                self.qlink1_data.loc[dict(time=timestamp, daPhase='openloop', aggregation=memberID)] = ncData.variables['qlink1'][self.linkIDCoords]
                self.z_gwsubbas_data.loc[dict(time=timestamp, daPhase='openloop', aggregation=memberID)] = ncData.variables['z_gwsubbas'][self.linkIDCoords]

        