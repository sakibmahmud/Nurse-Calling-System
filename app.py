
#nurse calling system code

import paho.mqtt.client as mqtt
from flask import Flask, render_template, redirect, url_for, request, session, flash,request
from flask_socketio import SocketIO, emit
from functools import wraps
import json
import sqlite3
import yaml
import time
import smtplib

app = Flask(__name__)
app.config['SECRET_KEY'] = 'IDDL'
socketio = SocketIO(app)


def login_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        if 'logged_in' in session:
            return f(*args, **kwargs)
        else:
            flash('You need to login first.')
            return redirect(url_for('login'))

    return wrap

	
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

   

# The callback for when the client receives a CONNACK response from the server.
# a mqtt client is any device that runs mqtt libraries
#this function will execute after the device connects to the server
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    client.subscribe("icu")
    client.subscribe("ccu")

#dividing the data according to their topic in the method
#this method can be used to print the message
def on_message(client, userdata, message):
    a=time.strftime("%I:%M:%S")
    x = yaml.load(message.payload)
    conn=sqlite3.connect('ncs.db')
    c=conn.cursor()
    #saving the message into database
    c.execute("INSERT INTO ncsreadings(device,message,currentdate,currentime,bed) VALUES(?,?,date('now'),?,?)",(x['device'], x['message'],a,x['bed']))
    conn.commit()
    conn.close()
    admin_data=[x]
    #emitting all data to admin
    socketio.emit('admin', admin_data) 
    #emitting icu data to icu users
    if message.topic == "icu":
        print("NCS table update")
        y=yaml.load(message.payload)
	icu_data=[y]
        socketio.emit('message',icu_data)
#ttt
    #emitting ccu data to ccu user    	
    if message.topic == "ccu":
        print("NCS table update")
	ccu_data=[x]
        socketio.emit('message1',ccu_data)


#creating instance of client class
mqttc=mqtt.Client()
mqttc.on_connect = on_connect
mqttc.on_message = on_message
#before publishing message or subscribing to topics, need to connect to the server
mqttc.connect("localhost",1883,60)
mqttc.loop_start()
@socketio.on('connect') 


#login part
#it will come after hitting base url
#contains two table-log and log_archive
@app.route('/',methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        a=request.form['username']
        b=request.form['password']
        #department=request.form['department']
        con = sqlite3.connect("ncs.db")
        cur = con.cursor()
        query=cur.execute('SELECT * FROM log WHERE username=(?) AND password=(?)',(a,b))
        results=query.fetchall()

        if len(results)==0:
            error = 'Invalid Credentials. Please try again.'
        else:
            session['logged_in']=True
            q=cur.execute('INSERT INTO log_archive (uname,pword,entry_time) VALUES(?,?,current_timestamp)',(a,b))
            con.commit()
            logout_id=cur.execute('SELECT max(id) FROM log_archive WHERE uname=(?) AND pword=(?)',(a,b))
            array_id=cur.fetchall()
            id=array_id[0][0]
            print(id)
            session['username']=a
            session['password']=b
            session['id']=id
            query_type=cur.execute('SELECT user_Type,department FROM log WHERE username=(?) AND password=(?)',(a,b))
            type=cur.fetchall()
            login_time = cur.execute('UPDATE log SET login_time=current_timestamp WHERE username=(?) AND password=(?)',(a,b))
            con.commit()
            if(type[0][0]=="ADMIN"):
                return redirect(url_for('admin_home'))
            elif(type[0][0]!="ADMIN" and type[0][1]=="ICU"):
                return redirect(url_for('icu_user'))
            elif(type[0][0]!="ADMIN" and type[0][1]=="CCU"):
                return redirect(url_for('ccu_user'))

    return render_template('home.html', error=error)

   

#admin page
#it will come up if an admin logs in
#admin  can also see the log archive
@app.route('/admin_home')
@login_required
def admin_home():
    conn=sqlite3.connect('ncs.db')
    conn.row_factory = dict_factory
    c=conn.cursor()
    c.execute("SELECT * FROM ncsreadings ORDER BY id DESC LIMIT 10")
    l=conn.cursor()
    l.execute("SELECT * FROM log_archive ORDER BY id DESC LIMIT 10")
    readings = c.fetchall()
    logs=l.fetchall()
    return render_template('admin.html',async_mode=socketio.async_mode,readings=readings,logs=logs)

	
#icu user page
#it will come up if an icu user logs in	
@app.route('/icu_user')
@login_required
def icu_user():
    return render_template('icu_user.html',async_mode=socketio.async_mode)

	
#ccu user page
#it will come up if a ccu user logs in
@app.route('/ccu_user')
@login_required
def ccu_user():
    return render_template('ccu_user.html',async_mode=socketio.async_mode)

#adding user part 
#only admin can do this	
@app.route('/addUser',methods=['GET', 'POST'])
@login_required
def addUser():
    error = None
    if request.method == 'POST':
        u = request.form['name']
        p = request.form['password']
        email=request.form['email']
        usertype=request.form['user_type']
        department=request.form['dep']
        con1 = sqlite3.connect("ncs.db")
        cur1 = con1.cursor()
        add_user=cur1.execute('INSERT INTO log (username,password,user_type,department) VALUES(?,?,?,?)',(u,p,usertype,department))
        con1.commit()
        gmail_user ="demo_user@gmail.com"
        gmail_pwd = "123456789"
        FROM = gmail_user
        TO = email
        SUBJECT = "Username and Password"
        TEXT = "Your Username is: "+ u + " And Password is: "+p
        message = """\From: %s\nTo: %s\nSubject: %s\n\n%s
            """ % (FROM, ", ".join(TO), SUBJECT, TEXT)
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.ehlo()
            server.starttls()
            server.login("demo@gmail.com", "123456789")
            #msg = "Your Username is: "+u+ "And Password is: "+p
            server.sendmail("demo@gmail.com",email, message)
            server.close()
            print('successfully sent the mail')
        except:
            print("failed to send mail")

    return ('', 204)	


#admin can delete user from here	
@app.route('/deleteUser',methods=['GET', 'POST'])
def delete():
    error = None
    if request.method == 'POST':
        user_name=request.form['user_name']
        con2 = sqlite3.connect("ncs.db")
        cur2 = con2.cursor()
        delete_user = cur2.execute('DELETE FROM log WHERE username=(?)',(user_name,))
        con2.commit()

    return ('', 204)
	

#showing the database record 	
#this part is not necessary
#just for testing
@app.route('/record') 
@login_required
def data_record():
   conn=sqlite3.connect('ncs.db')
   conn.row_factory = dict_factory
   c=conn.cursor()
   c.execute("SELECT * FROM ncsreadings ORDER BY id DESC LIMIT 10")
   readings = c.fetchall()
   #print(readings)
   return render_template('record.html', readings=readings)	
	
#for mapping portion
#mapping is between device against bed and floor	
#mapping can be done by the admin user through an interface available after logging in
@app.route('/map',methods=['GET', 'POST'])
def map():
    if request.method=='POST':
        a=request.form['device']
        print(a)
        b=request.form['bed']
        c=request.form['submit']
        con = sqlite3.connect("ncs.db")
        cur = con.cursor()
        if c == 'Update':
          result = cur.execute('UPDATE map SET device=(?) WHERE bed=(?)',(request.form['device'], request.form['bed']))
          con.commit()
        elif c=='Connect':
          result=cur.execute('INSERT INTO map (device,bed) VALUES(?,?)', (request.form['device'],request.form['bed']))
          con.commit()
    return 'Data OK'
	
#function to show the mapping date between a device and a bed
@app.route('/show')
def show():
    con = sqlite3.connect("ncs.db")
    cur = con.cursor()
    query = cur.execute('SELECT * FROM map')
    return render_template('show.html',items=query.fetchall())
	
#logout part of the application
@app.route('/logout')
@login_required
def logout():
    print('logout portion')
    a=session.get('username',None)
    b=session.get('password',None)
    c=session.get('id',None)
    con = sqlite3.connect("ncs.db")
    cur = con.cursor()
    logout_time = cur.execute('UPDATE log SET logout_time=current_timestamp WHERE username=(?) AND password=(?)',(a,b))
    con.commit()
    out_time=cur.execute('UPDATE log_archive SET out_time=current_timestamp WHERE uname=(?) AND pword=(?) AND id=(?)',(a,b,c))
    con.commit()
    session.pop('logged_in',None)
    return redirect(url_for('login'))		
	

if __name__ == "__main__":
   app.run(host='0.0.0.0', port=8080,threaded=True)
  # app.run(threaded =True)
   socketio.run(app, debug=True)
