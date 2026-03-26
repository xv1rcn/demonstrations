from flask import Flask


app = Flask(__name__)


@app.get("/")
def hello() -> str:
    return "Hello, Flask!"


if __name__ == "__main__":
    app.run(debug=True)
