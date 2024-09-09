import os
import f90nml
import shutil
import argparse

def obs_seq_to_netcdf_wrapper(obs_data_dir):
    # wrapper function to convert obs_seq files to 
    # netcdf format for ease of parsing
    # requires obs_seq_to_netcdf utility to be built
    # for the wrf_hydro model

    cwd = os.getcwd()   # DART/hydrovis
    dartPath = cwd[:cwd.index('DART')+4]

    obs_seq_to_netcdf_dir_path = os.path.join(dartPath, 'models', 'wrf_hydro', 'work')

    shutil.copy2(os.path.join(obs_seq_to_netcdf_dir_path, 'input.nml'),
                 os.path.join(obs_seq_to_netcdf_dir_path, 'input_org.nml'))
    
    nml_data = f90nml.read(os.path.join(obs_seq_to_netcdf_dir_path, 'input.nml'))

    # set working directory to obs_seq_to_netcdf_utility_path for the utility to work correctly
    os.chdir(obs_seq_to_netcdf_dir_path)
    
    for timestamp in os.listdir(os.path.join(obs_data_dir, 'output')):
        # check if file exists
        if os.path.exists(os.path.join(obs_data_dir, 'output', timestamp, f'obs_seq.final.{timestamp}.nc')):
            continue

        # set the file path for the obs_seq file to be converted to netcdf
        nml_data['obs_seq_to_netcdf_nml']['obs_sequence_name'] = os.path.join(obs_data_dir, 'output', timestamp, f'obs_seq.final.{timestamp}')
        nml_data['obs_seq_to_netcdf_nml']['obs_sequence_list'] = ''
        nml_data.write(os.path.join(obs_seq_to_netcdf_dir_path, 'input.nml'), force=True)

        # run the obs_seq_to_netcdf utility
        os.system('./obs_seq_to_netcdf')

        # move the netcdf file back in its appropriate place
        shutil.copy2('obs_epoch_001.nc', 
                     os.path.join(obs_data_dir, 'output', timestamp, f'obs_seq.final.{timestamp}.nc'))
        
        os.remove('obs_epoch_001.nc')

    os.remove(os.path.join(obs_seq_to_netcdf_dir_path, 'input.nml'))
    os.rename(os.path.join(obs_seq_to_netcdf_dir_path, 'input_org.nml'), os.path.join(obs_seq_to_netcdf_dir_path, 'input.nml'))

    # restore calling function's working directory
    os.chdir(cwd)

def clear_obs_seq_netcdf_files(obs_data_dir):
    for timestamp in os.listdir(os.path.join(obs_data_dir, 'output')):
        netcdfFile = os.path.join(obs_data_dir, 'output', timestamp, f'obs_seq.final.{timestamp}.nc')
        if os.path.exists(netcdfFile):
            os.remove(netcdfFile)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog="HydroVis - helper to convert obs_seq files to netcdf format")
    parser.add_argument('-f', '--modelFilesPath', required=True)
    parser.add_argument('-d', '--deleteNetcdfFiles', action='store_true')

    args = parser.parse_args()
    obs_data_dir = args.modelFilesPath
    deleteNetCDFFiles = args.deleteNetcdfFiles

    if deleteNetCDFFiles:
        clear_obs_seq_netcdf_files(obs_data_dir)

    else:
        obs_seq_to_netcdf_wrapper(obs_data_dir)