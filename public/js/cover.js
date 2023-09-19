function displayCover(data) {
  document.getElementById("template").classList.remove("hidden");
  document.getElementById("template-cover").src = data.data.images[0].url;
  document.getElementById("template-front-title").innerHTML = data.data.name;
  document.getElementById("template-front-title2").innerHTML = data.data.name;
  document.getElementById("template-front-subtitle").innerHTML =
    document.getElementById("template-front-subtitle2").innerHTML = data.data
      .artists
      ? data.data.artists[0].name
      : data.data.owner.display_name;

  let trackNames = data.data.tracks.items.map((o) =>
    o.name ? o.name : o.track.name
  );
  let joinedTrackNames = trackNames.join(" • ");
  console.log(joinedTrackNames);
  document.getElementById("template-tracks").innerHTML = joinedTrackNames;

  const firstHalf = trackNames
    .slice(0, Math.floor(trackNames.length / 2))
    .join(" • ");
  const secondHalf = trackNames
    .slice(-Math.floor(trackNames.length / 2))
    .join(" • ");
  console.log(firstHalf);
  console.log(secondHalf);

  document.getElementById("template-side-a").innerHTML = firstHalf;
  document.getElementById("template-side-b").innerHTML = secondHalf;
}
