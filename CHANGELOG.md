### v1.0.29
* added Logs to menu options
  - users can now share logs with staff in order to help debugging
* reworked google account menu
  - selecting a google account now opens a modal where users can
    - login
    - open solvers for specific sites
    - set a proxy

### v1.0.28
* fix export / import functionality
* added Logs option to menu
  - this option will open the directory where logs are kept, and users can share these with support / devs to help troubleshoot issues

### v1.0.25
* tasks will now be saved after task creation in addition to being saved on close
* fix supreme instore module
* fix supreme modules
  - fast (no product page load + backbone)
  - safe (product page load + backbone)
  - browser (product page load + no backbone)

### v1.0.23
* added "All Profiles" option in task creation. When selected will create a task per profile per task qty.
* added new Tasks to menu.
  - can now import and export tasks
* added Supreme (Safe), more browser like, navigates to product page and atc first available
* tasks are now saved when closing bot and loaded when starting bot
* fix profile import error, profile type check was too strict
* fix Footsite module
* bump AutoSolve version

### v1.0.22
* fix import profile error, profile type check was too strict in determining proper format
* added All Profiles option to the profile options in task creation. If selected will create a task per profile per task qty

### v1.0.20
* cookies are now cleared on export
* added counter to harvester tasks
* added Akamai Cookie Harvester support for
  - Adidas Europe
  - Footlocker Europe
  - JD Sports
  - Size
  - Footlocker CA
  - Kids Footlocker
  - Footpatrol
  - The Hip Store
  - Converse
  - Dicks Sporting Goods
* added Eve AIO support for cookie export
* fixed Sole AIO export to reflect changes
  
---

### v1.0.19
* updated cookie gen
* fixed AYCD Autosolve
* added password field in General Settings
* added support for AYCD Universal Billing
* added support for import and export of profiles
 - **Menu > Profiles > Import** to import profiles
 - **Menu > Profiles > Export** to export profiles
* added 2Captcha Support
 - **Menu > Captcha > 2Captcha > Settings** to configure
* added Captcha to Settings menu
  - moved Google Account Management to **Menu > Captcha**
  - moved AYCD Autosolve settings to **Menu > Captcha**
  - moved 2Captcha settings to **Menu > Captcha**
* added site selection for Captcha Solver
* added Cookies to Settings menu
  - moved Cookie Harvester Status to **Menu > Cookies**
  - moved Export Cookies to **Menu > Cookies**
* added support for Supreme Instore Sign-ups
---