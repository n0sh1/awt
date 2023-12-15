export default function processOpnFrmData(event) {
    // 1. Prevent normal event (form sending) processing
    event.preventDefault();

    // 2. Read and adjust data from the form (here we remove white spaces before and after the strings)
    const nopName = document.getElementById("nameElm").value.trim();
    const nopOpn = document.getElementById("opnElm").value.trim();
    const favPorsch = document.getElementById("favoritePorsche").value;

    // Check if the element with ID "willReturnElm" exists
    const willReturnElm = document.getElementById("willReturnElm");
    const nopWillReturn = willReturnElm ? willReturnElm.checked : false;

    // 3. Verify the data
    if (nopName === "" || nopOpn === "") {
        window.alert("Please, enter both your name and opinion");
        return;
    }

    // 4. Add the data to the array opinions and local storage
    const newOpinion = {
        name: nopName,
        comment: nopOpn,
        cars: [favPorsch],
        // willReturn: nopWillReturn,
        // created: new Date()
    };

    let opinions = [];

    if (localStorage.myTreesComments) {
        opinions = JSON.parse(localStorage.myTreesComments);
    }

    opinions.push(newOpinion);
    localStorage.myTreesComments = JSON.stringify(opinions);

    // 5. Go to the opinions
    window.location.hash = "#opinions";
}
