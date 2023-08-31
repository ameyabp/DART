import netCDF4 as nc
import xarray as xr
import numpy as np
import os

# descriptor attributes for links
linkDescriptor = [
    'lat', 'lon',   # link or gauge location
    'srcLon', 'srcLat', # link start location, NA for gauge
    'dstLon', 'dstLat', # link end location, NA for gauge
    'gauge' # enum: 0=no gauge, 1=assimilated gauge, 2=non-assimilated gauge
]

# Class definition for parsing routeLink data
# and creating xarray dataArray data structure from it

class RouteLinkData:
    def __init__(self, routeLinkFileName, datacube, createXarrayFromScratch):
        routeLinkData = nc.Dataset(routeLinkFileName)
        self.linkIDs = routeLinkData.variables['link'][:]
        self.numLinks = len(self.linkIDs)
        self.lat = routeLinkData.variables['lat'][:]
        self.lon = routeLinkData.variables['lon'][:]
        self.fromIndices = routeLinkData.variables['fromIndices'][:]
        self.fromIndsStart = routeLinkData.variables['fromIndsStart'][:]
        self.fromIndsEnd = routeLinkData.variables['fromIndsEnd'][:]
        noUpLinks = self.fromIndsStart == 0
        self.numUpLinks = self.fromIndsEnd - self.fromIndsStart + 1
        self.numUpLinks[noUpLinks] = 0
        # we only care about links which are themselves uplinks to some links
        # the linkID array indices for such links is in fromIndices
        self.linkIDCoords = self.fromIndices
        
        # read precomputed data cube or construct it here
        # constructing takes time
        if not createXarrayFromScratch and os.path.exists(os.path.join('datacube', 'routeLinkData.nc')):
            self.linkData = xr.open_dataarray(os.path.join('datacube', 'routeLinkData.nc'))
            # TODO: Check additional options for reading netcdf files into xarray data array

        else:
            self.linkData = xr.DataArray(
                data=np.ndarray((len(self.linkIDCoords), len(linkDescriptor))),
                coords={'linkID': self.linkIDCoords, 'descriptor': linkDescriptor},
                dims=['linkID', 'descriptor'],
                name='routeLinkData'
            )
        
            for i in range(self.numLinks):
                if self.numUpLinks[i] == 0:
                    continue

                linkIDArrayIndices = self.fromIndices[self.fromIndsStart[i] - 1: self.fromIndsEnd[i]] - 1
                # it should have been
                # linkIndices = self.rl.fromIndices[self.rl.fromIndsStart[i]: self.rl.fromIndsEnd[i]+1]
                # but the netcdf files were written using 1-based indexes for fromIndsStart, fromIndsEnd and fromIndices
                # therefore to make it work with python's netCDF library, we do a '-1' for each of the three array accesses
                assert (self.numUpLinks[i] == len(linkIDArrayIndices))

                for linkIDArrayIndex in linkIDArrayIndices:
                    # to be consistent with the way the data was written in the original netCDF files (1-based index)
                    # change from python netCDF library's 0-based index to 1-based index with a '+1'
                    # only for storing the linkIDArrayIndex, not for accessing the lat and lon arrays
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='lat')] = (self.lat[linkIDArrayIndex] + self.lat[i]) / 2
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='lon')] = (self.lon[linkIDArrayIndex] + self.lon[i]) / 2
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='srcLat')] = self.lat[linkIDArrayIndex]
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='srcLon')] = self.lon[linkIDArrayIndex]
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='dstLat')] = self.lat[i]
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='dstLon')] = self.lon[i]
                    self.linkData.loc[dict(linkID=linkIDArrayIndex+1, descriptor='gauge')] = 0
                    # TODO: Update gauge descriptor as per gauge location data from routelink and obs_seq files

        datacube.addDataArray('routeLinkData', self.linkData)

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

    def getRouteLinkData(self):
        # construct json data structure to send to the front end
        routeLinkData = [
            {
                'linkID': lid.item(),
                'lon': self.linkData.sel(linkID=lid, descriptor='lon').item(),
                'lat': self.linkData.sel(linkID=lid, descriptor='lat').item(),
                'line': {
                    'type': 'LineString',
                    'coordinates': [
                        self.linkData.sel(linkID=lid, descriptor=['srcLon', 'srcLat']).data.tolist(),
                        self.linkData.sel(linkID=lid, descriptor=['dstLon', 'dstLat']).data.tolist(),
                    ]
                },
                'gauge': self.linkData.sel(linkID=lid, descriptor='gauge').item()
            }
            for lid in self.linkData.coords['linkID']
        ]
        
        # for linkIDArrayIndex in self.linkData.coords['linkID']:
        #     data = {}
        #     data['linkID'] = linkIDArrayIndex.item()
        #     data['lat'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='lat').item()
        #     data['lon'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='lon').item()
        #     # data['srcLat'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='srcLat')
        #     # data['srcLon'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='srcLon')
        #     # data['dstLat'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='dstLat')
        #     # data['dstLon'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='dstLon')
        #     data['line'] = {
        #         'type': "LineString",
        #         'coordinates': [
        #             [self.linkData.sel(linkID=linkIDArrayIndex, descriptor='srcLon').item(), self.linkData.sel(linkID=linkIDArrayIndex, descriptor='srcLat').item()],
        #             [self.linkData.sel(linkID=linkIDArrayIndex, descriptor='dstLon').item(), self.linkData.sel(linkID=linkIDArrayIndex, descriptor='dstLat').item()]
        #         ]
        #     }
        #     data['gauge'] = self.linkData.sel(linkID=linkIDArrayIndex, descriptor='gauge').item()

        #     routeLinkData.append(data)

        return routeLinkData