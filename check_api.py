import requests
r = requests.get('http://localhost:8000/api/student/22001/results')
print(r.status_code)
print(r.text)
