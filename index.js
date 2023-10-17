import axios from "axios";
import ConvertApi from "./node_modules/convertapi-js/dist/convertapi.js";

const showFile = async function (e) {
  e.preventDefault();
  let data;
  async function createNode() {
    // the blockstore is where we store the blocks that make up files
    const blockstore = new MemoryBlockstore()

    // application-specific data lives in the datastore
    const datastore = new MemoryDatastore()

    // libp2p is the networking layer that underpins Helia
    const libp2p = await createLibp2p({
      datastore,
      addresses: {
        listen: [
          '/ip4/127.0.0.1/tcp/0'
        ]
      },
      transports: [
        tcp()
      ],
      connectionEncryption: [
        noise()
      ],
      streamMuxers: [
        yamux()
      ],
      peerDiscovery: [
        bootstrap({
          list: [
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
            '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
          ]
        })
      ],
      services: {
        identify: identifyService()
      }
    })

    return await createHelia({
      datastore,
      blockstore,
      libp2p
    })
  }

  // create two helia nodes
  const node1 = await createNode()

  // connect them together
  // const multiaddrs = node2.libp2p.getMultiaddrs()
  // await node1.libp2p.dial(multiaddrs[0])

  // create a filesystem on top of Helia, in this case it's UnixFS
  const fs = unixfs(node1)

  // we will use this TextEncoder to turn strings into Uint8Arrays
  const encoder = new TextEncoder()

  // const fileObj = document.getElementById("inp");
  // let file = fileObj.files[0];
  const fileObj = document.getElementById('inp').addEventListener('change', function () {
    var reader = new FileReader();

    reader.onload = function () {
      var base64String = reader.result.replace("data:", "")
        .replace(/^.+,/, "");

      console.log(base64String);
      data = base64String;
    }



  });
  loader.style.visibility = "visible";
  axios.post('http://127.0.0.0/encrypt-image', data)
    .then(function (response) {
      console.log(response);
      data = response.data
    })
    .catch(function (error) {
      console.log(error);
    });
  const cid = await fs.addBytes(encoder.encode(`${data}`))
  console.log('Added file:', cid.toString())
  loader.style.visibility = "hidden";
  localStorage.setItem("hash", cid.toString());
};

const render = async function (hash) {
  loader.style.visibility = "visible";

  axios.get(`https://ipfs.io/ipfs/${hash}`)
    .then(function (response) {
      console.log(response);

      // If the response is the base64 encoded image data, 
      // convert it to an image source and append it to the container
      const base64Data = response.data;
      const img = document.createElement("img");
      img.src = "data:image/jpeg;base64," + base64Data; // Assuming it's a jpeg image. If not, adjust the MIME type accordingly.

      container.appendChild(img);
      loader.style.visibility = "hidden";
    })
    .catch(function (error) {
      console.log(error);
      loader.style.visibility = "hidden";
    });
};


//enroll hyperledger users
function createUserHyperledger(username) {
  loader.style.visibility = "visible";

  axios
    .post("http://localhost:4000/users", {
      username: username,
      orgName: "Org1",
    })
    .then(function (response) {
      console.log(response);
      const {
        data: { token },
      } = response;
      localStorage.setItem("token", token);
      const tkn = localStorage.getItem("token");
      loader.style.visibility = "hidden";

      alert(`Your Token is \n${tkn}`);
      console.log(tkn);
    })
    .catch(function (error) {
      console.log(error);
    });
}

/// retreiving from hyperledger

const retreiveFromHyperledger = async function (e) {
  e.preventDefault();
  container.innerHTML = "";
  const token = localStorage.getItem("token");
  const count = localStorage.getItem("count");
  const config = {
    headers: { Authorization: `Bearer ${token}` },
  };

  for (let i = 1; i < count; i++) {
    axios
      .get(
        `http://localhost:4000/channels/mychannel/chaincodes/fabcar?args=["${i}"]&fcn=GetCarById`,
        config
      )
      .then(function (response) {
        console.log(response);
        const {
          data: {
            result: { make },
          },
        } = response;
        console.log(make);
        render(make);
      })
      .catch(function (error) {
        console.log(error);
      });
  }
};

//uploading to hyperledger
const uploadToHyperledger = async function () {
  const token = localStorage.getItem("token");
  const id = localStorage.getItem("count");
  const hash = localStorage.getItem("hash");
  console.log(id);
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  axios
    .post(
      "http://localhost:4000/channels/mychannel/chaincodes/fabcar",
      {
        fcn: "CreateCar",
        chaincodeName: "fabcar",
        channelName: "mychannel",
        args: [
          `{"id":"${id}","make":"${hash}","addedAt":0,"model":"Null", "color":"Null","owner":"${token}"}`,
        ],
      },
      config
    )
    .then(function (response) {
      // handle success
      console.log(response);
      // const {
      //   data: {
      //     result: {
      //       result: { txid },
      //     },
      //   },
      // } = response;
      // localStorage.setItem("transcationId", txid);
      localStorage.setItem("count", Number(id) + 1);
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    });
};

const query = function () {
  const hash = localStorage.getItem("hash");
  uploadToHyperledger();
};

const register = function () {
  let username = prompt("Enter Your User Name : ");
  console.log(username);
  if (username != null && username != "") createUserHyperledger(username);
  else register();
};

const settingUpToken = async function () {
  let token = prompt("Enter Your Token (Enter -1 if you don't have one)");
  console.log(token);
  if (token != null && token != "") {
    if (token == -1) {
      register();
    } else localStorage.setItem("token", token);
  } else settingUpToken();
};

const inp = document.getElementById("inp");
inp.addEventListener("change", showFile);

const submit = document.getElementById("submit");
submit.addEventListener("click", query);

const display = document.getElementById("display");
display.addEventListener("click", retreiveFromHyperledger);

const loader = document.getElementById("loader");
const container = document.querySelector(".img-container");

settingUpToken();
// retreiveFromHyperledger();
