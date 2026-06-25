!macro customInstall
  # Creates a shortcut in the user's Startup folder during installation
  CreateShortCut "$SMSTARTUP\Togen.lnk" "$INSTDIR\Togen.exe" ""
!macroend

!macro customUninstall
  # Clean up and remove the shortcut if they uninstall the app
  Delete "$SMSTARTUP\Togen.lnk"
!macroend