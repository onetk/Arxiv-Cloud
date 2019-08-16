import { h, Component } from "preact";
import firebase from "./firebase";
import { getPrivateMessage, getPublicMessage } from "./api";

const API_ENDPOINT = process.env.BACKEND_API_BASE;

class ArticleClient {
  constructor() {
    this.token = "";
  }

  async postArticle(title, body) {
    await this.getToken();
    return fetch(`${API_ENDPOINT}/articles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify({ title, body })
    }).then(v => v.json());
  }

  async getToken() {
    if (this.token === "") {
      this.token = await firebase.auth().currentUser.getIdToken();
    }
  }
}

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

function request(method, url) {
  return fetch(url).then(function(res) {
    if (res.ok) {
      // console.log(res.status);
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

  render(props, state) {
    if (state.user === null) {
      return <button onClick={firebase.login}>Please login</button>;
    }

    return (
      <div>
        <div style="padding:50px;">{state.message}</div>
        <div style="margin:auto; width:280px;">
          <p style="color:red;">{state.errorMessage}</p>
          <button onClick={this.getPrivateMessage.bind(this)}>
            Get Private Message
          </button>
          <button onClick={firebase.logout}>Logout</button>
          <button onClick={this.getAllArticles.bind(this)}>Get All</button>
          <button onClick={this.postArticles.bind(this)}>POST</button>
          <button onClick={this.deleteArticles.bind(this)}>Del All</button>
        </div>
      </div>
    );
  }
}

export default App;
