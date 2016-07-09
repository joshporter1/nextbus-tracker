from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update')
def update():
	return "Updates will go here..."

# start the server
if __name__ == '__main__':
	app.run(debug=True)