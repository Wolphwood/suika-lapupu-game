local LBPhone = exports["lb-phone"]
local identifier = "lb-lapuboom"

while GetResourceState("lb-phone") ~= "started" do
  Wait(500)
end

local function addApp()
  local added, errorMessage = exports["lb-phone"]:AddCustomApp({
    identifier = identifier,

    name = "Lapubomb",
    description = "Merge Lapupus",
    developer = "Wolphwood (based on Moonfloof's work)",

    landscape = false,
    defaultApp = false,
    size = 5752296,
    keepOpen = false,
    
    images = {
      "https://cfx-nui-" .. GetCurrentResourceName() .. "/ui/assets/screenshots/screenshot.png",
    },

    -- ui = "http://localhost:8000/",
    ui = GetCurrentResourceName() .. "/ui/index.html",

    icon = "https://cfx-nui-" .. GetCurrentResourceName() .. "/ui/assets/icon.png",

    fixBlur = true,
  })

  if not added then
    print("Could not add app:", errorMessage)
  end
end

addApp()

AddEventHandler("onResourceStart", function(resource)
  if resource == "lb-phone" then
    addApp()
  end
end)