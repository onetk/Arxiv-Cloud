import { h, Component } from "preact";
import firebase from "./firebase";
import { getPrivateMessage, getPublicMessage } from "./api";

const API_ENDPOINT = process.env.BACKEND_API_BASE;

const successHandler = function(text) {
  const lists = JSON.parse(text);
  const items = [];
  for (let i = 0; i < lists.length; i++) {
    // console.log(lists[i]);
    items.push(
      <div style="border-bottom:solid 1px lightgray; margin: auto;  padding:10px 5px 0 0; width:250px;">
        {lists[i].id} {lists[i].title} {lists[i].body}
      </div>
    );
  }

  return items;
};
const errorHandler = function(error) {
  return error.message;
};

const successPaperHandler = function(text) {
  const lists = text;
  // const items = [];
  // for (let i = 0; i < lists.length; i++) {
  //   // console.log(lists[i]);
  //   items.push(
  //     <div style="border-bottom:solid 1px lightgray; margin: auto;  padding:10px 5px 0 0; width:250px;">
  //       {lists[i].id} {lists[i].title} {lists[i].body}
  //     </div>
  //   );
  // }

  return lists;
};

function request(method, url) {
  return fetch(url).then(function(res) {
    if (res.ok) {
      if (res.status == 200 && method == "PUT") {
        return "success!!";
      }

      try {
        JSON.parse(res);
        return res.json();
      } catch (error) {
        return res.text();
      }
    }
    if (res.status < 500) {
      throw new Error("4xx error");
    }
    throw new Error("5xx error");
  });
}

class App extends Component {
  constructor() {
    super();
    this.state.user = null;
    this.state.message = "";
    this.state.errorMessage = "";
    this.state.token = "";
    this.state.text = "";
  }

  async getToken() {
    if (this.state.token === "") {
      this.state.token = await firebase.auth().currentUser.getIdToken();
    }
  }

  componentDidMount() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        this.setState({ user });
      } else {
        this.setState({
          user: null
        });
      }
    });
  }

  getPrivateMessage() {
    this.state.user
      .getIdToken()
      .then(token => {
        return getPrivateMessage(token);
      })
      .then(resp => {
        this.setState({
          message: resp.message
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: error.toString()
        });
      });
  }

  getAllArticles() {
    request("GET", "http://localhost:1991/articles")
      .then(resp => {
        this.setState({
          message: successHandler(resp)
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: errorHandler(error)
        });
      });
  }

  // getPapers() {
  //   request("GET", "http://localhost:1991/articles/paper")
  //     .then(resp => {
  //       this.setState({
  //         message: successHandler(resp)
  //       });
  //     })
  //     .catch(error => {
  //       this.setState({
  //         errorMessage: errorHandler(error)
  //       });
  //     });
  // request(
  //   "GET",
  //   "http://export.arxiv.org/api/query?search_query=all:" +
  //     "deeplearning" +
  //     "&start=0&max_results=100"
  // )
  //   .then(resp => {
  //     this.setState({
  //       message: successPaperHandler(resp)
  //     });
  //   })
  //   .catch(error => {
  //     this.setState({
  //       errorMessage: errorHandler(error)
  //     });
  //   });
  // }

  async getPapers() {
    await this.getToken();

    return fetch(`http://localhost:1991/articles/paper`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      },
      body: JSON.stringify({ title: "ok", body: "google" })
      // body: JSON.stringify({ keyword: "google" })
    })
      .then(resp => {
        console.log(resp);
        this.setState({
          message: successPaperHandler(resp)
        });
      })
      .catch(error => {
        this.setState({
          errorMessage: errorHandler(error)
        });
      });
  }

  async deleteArticles() {
    await this.getToken();

    return fetch(`http://localhost:1991/articles`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      }
    });
  }

  async postArticles() {
    await this.getToken();

    return fetch(`http://localhost:1991/articles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.state.token}`
      },
      body: JSON.stringify({ title: "ok", body: "google" })
    });
  }

  handleChange(e) {
    this.setState({ text: e.target.value });
  }

  handleKeyDown(e) {
    if (e.key === "Enter") {
      console.log(this.state.text, "ok");
      e.preventDefault();

      const textareaElement = e.target;

      const currentText = textareaElement.value;

      const start = textareaElement.selectionStart;
      const end = textareaElement.selectionEnd;

      const spaceCount = 4;
      const substitution = Array(spaceCount + 1).join(" ");

      const newText =
        currentText.substring(0, start) +
        substitution +
        currentText.substring(end, currentText.length);

      this.setState(
        {
          text: newText
        },
        () => {
          textareaElement.setSelectionRange(
            start + spaceCount,
            start + spaceCount
          );
        }
      );
    }
  }

  render(props, state) {
    if (state.user === null) {
      return <button onClick={firebase.login}>Please login</button>;
    }

    return (
      <div>
        <h2 class="title word">Arxiv Cloud</h2>

        <div class="search-form">
          <textarea
            class="search-text"
            placeholder="Search"
            onChange={this.handleChange.bind(this)}
            onKeyDown={this.handleKeyDown.bind(this)}
          />
          <img src="search.png" class="search-icon" />
        </div>

        <div class="state_messages">{state.message}</div>
        <div style="margin:auto; width:280px;">
          <p style="color:red;">{state.errorMessage}</p>
          <button onClick={this.getPrivateMessage.bind(this)}>
            Get Private Message
          </button>
          <button onClick={firebase.logout}>Logout</button>
          <button onClick={this.getAllArticles.bind(this)}>Get All</button>
          <button onClick={this.postArticles.bind(this)}>POST</button>
          <button onClick={this.deleteArticles.bind(this)}>Del All</button>
          <button onClick={this.getPapers.bind(this)}>Get Paper</button>
        </div>
      </div>
    );
  }
}

export default App;
