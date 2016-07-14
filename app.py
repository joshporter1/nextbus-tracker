from flask import Flask, render_template, Response
import os
import httplib2

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update')
def update():
  resp, content = httplib2.Http().request("http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t=1144953500233")
  print(resp)
  print(content)
  return Response(content, mimetype='application.xml')

# start the server
if __name__ == '__main__':
	port = int(os.environ.get("PORT", 5000))
	app.run(debug=True, host='0.0.0.0', port=port)