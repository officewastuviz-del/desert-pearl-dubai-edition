(() => {
  "use strict";
  const config=window.PROPERTY_CONFIG||{};
  const name=config.name||"Desert Pearl Residences";
  document.querySelectorAll("[data-property-name]").forEach((element)=>{element.textContent=name;});
  document.querySelectorAll("[data-property-location]").forEach((element)=>{element.textContent=config.location||"Dubai, United Arab Emirates";});
  document.querySelectorAll("[data-property-logo]").forEach((image)=>{if(config.logo)image.src=config.logo;image.alt=`${name} logo`;});
  document.title=`AR Preview | ${name}`;
  const phone=document.querySelector("[data-phone]");
  const label=document.querySelector("[data-placement-label]");
  const trigger=document.querySelector("[data-place-trigger]");
  const video=document.querySelector("[data-ar-video]");
  let placed=false;
  trigger?.addEventListener("click",()=>{
    placed=!placed;
    phone?.classList.toggle("is-placed",placed);
    if(label)label.textContent=placed?"AR EXPERIENCE ACTIVE":"FINDING A SURFACE";
    if(trigger)trigger.querySelector("span").textContent=placed?"Reset placement":"Simulate placement";
    if(placed){
      if(video)video.currentTime=0;
      video?.play().catch(()=>{});
    }else{
      video?.pause();
      if(video)video.currentTime=0;
    }
  });
})();
