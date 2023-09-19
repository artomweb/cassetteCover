function displayError(err) {
  console.error(err);
}

const loginForm = document.getElementById("playlistIDForm");
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const playlistIDInput = document.getElementById("playlistIDInput");
  console.log(playlistIDInput.value);
  const linkURL = playlistIDInput.value;

  const match = linkURL.match(/[A-Za-z0-9]{22}/);

  if (match !== null) {
    fetch(
      "/playlistInfo?" +
        new URLSearchParams({
          linkURL,
        }),
      {
        method: "get",
      }
    )
      .then((resp) => resp.json())
      .then((data) => {
        if (data.error === null) {
          console.log(data);
          displayCover(data);
        } else {
          displayError(data.error);
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else {
    displayError("Invalid URL");
  }
});
