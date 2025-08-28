# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, '15.1'
prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target 'DamInspectApp' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    # Disable Hermes to resolve compatibility issues
    :hermes_enabled => false
  )

  post_install do |installer|
    # https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      # :ccache_enabled => true
    )
    
    # Fix deployment target and build settings for all pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        # Set consistent iOS deployment target
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        
        # Fix Hermes and React Native conflicts
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= []
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'HERMES_ENABLE_DEBUGGER=1'
        
        # Fix duplicate symbol issues
        config.build_settings['OTHER_LDFLAGS'] ||= []
        config.build_settings['OTHER_LDFLAGS'] << '-Wl,-weak_reference_mismatches,weak'
        
        # Disable bitcode (not needed for iOS 13.4+)
        config.build_settings['ENABLE_BITCODE'] = 'NO'
        
        # Fix privacy info warnings
        config.build_settings['GENERATE_INFOPLIST_FILE'] = 'YES'
        
        # Fix MapboxMaps specific issues
        if target.name.include?('MapboxMaps')
          config.build_settings['SWIFT_VERSION'] = '5.0'
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
        
        # Fix Turf library issues
        if target.name.include?('Turf')
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end
  end
end