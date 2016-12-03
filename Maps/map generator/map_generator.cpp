#include <iostream>
#include <algorithm>
#include <cstring>
#include <fstream>
#include <sstream>

using namespace std;

void write_to_file(float*, float*,float*);
ofstream myfile;
int main()
{
	char id[100];
	int num_of_objects;
	cout << "########### SKYMAP GENERATOR #############\n";
	
	cout << "Enter name: ";  

	cin >> id;

	stringstream ss;
	ss << "../"<<id<<".json";
	string vertices = ss.str();

	strcat(id,".json");
	myfile.open (id);
	
	cout << "Enter number of objects:";
	cin >> num_of_objects;

	float color[3];
	float start_vert[3], end_vert[3];
	myfile << "[\n";
	for(int i=0; i<num_of_objects;i++)
	{
		cout << "## NEW OBJECT ##\n";
		cout << "Enter color : ";
		for(int j=0; j<3;j++)
		{
			cin >> color[j];
		}

		cout << "Enter opposite vertices :";
		for(int j=0; j<3;j++)
		{
			cin >> start_vert[j];
		}

		for(int j=0; j<3;j++)
		{
			cin >> end_vert[j];
		}
		
		write_to_file(color,start_vert,end_vert);
		if(i+1 < num_of_objects)
			myfile <<",\n";
		else
			myfile <<"\n";
	}
	myfile <<"]";
    myfile.close();
	return 0;
}


void write_to_file(float color[3],float start_vert[3], float end_vert[3])
{
	stringstream ss;
	ss << "["<<start_vert[0]<<", "<<start_vert[1]<<", "<<start_vert[2]<<"],["<<end_vert[0]<<", "<<start_vert[1]<<", "<<start_vert[2]<<"],["<<end_vert[0]<<", "<<end_vert[1]<<", "<<start_vert[2]<<"],["<<start_vert[0]<<", "<<end_vert[1]<<", "<<start_vert[2]<<"],["<<end_vert[0]<<", "<<start_vert[1]<<", "<<end_vert[2]<<"],["<<end_vert[0]<<", "<<end_vert[1]<<", "<<end_vert[2]<<"],["<<start_vert[0]<<", "<<end_vert[1]<<", "<<end_vert[2]<<"],["<<start_vert[0]<<", "<<start_vert[1]<<", "<<end_vert[2]<<"]";
	string vertices = ss.str();
		// cout << *min_element(color, color+3)<<"\n";
	// cout << color[0]<<"\n";

    myfile << "  {\n";
    // "material": {"ambient": [0.1,0.1,0.1], "diffuse": [0,0.6,0], "specular": [0.3,0.3,0.3], "n": 11}, 
    myfile << "    \"material\": {\"ambient\": [0.1,0.1,0.1], \"diffuse\": ["<<color[0]<<","<<color[1]<<","<<color[2]<<"], \"specular\": [0.3,0.3,0.3], \"n\": 11},\n" ;	
    /*
    "vertices": [[-1, 0.1, 0],[0, 0.1, 0],[0, 0.3, 0],[-1, 0.3, 0],[0, 0.1, 20],[0, 0.3, 20],[-1, 0.3, 20],[-1, 0.1, 20],
                    [-1, 0.1, 0],[0, 0.1, 0],[0, 0.3, 0],[-1, 0.3, 0],[0, 0.1, 20],[0, 0.3, 20],[-1, 0.3, 20],[-1, 0.1, 20],
                    [-1, 0.1, 0],[0, 0.1, 0],[0, 0.3, 0],[-1, 0.3, 0],[0, 0.1, 20],[0, 0.3, 20],[-1, 0.3, 20],[-1, 0.1, 20]],
    */

	myfile << "    \"vertices\": ["<<vertices<<",\n";	
	myfile <<"                "<<vertices<<",\n";
	myfile <<"                "<<vertices<<"],\n";
	/*
	"normals": [[-1, 0, 0],[1, 0,0],[1, 0,0],[-1, 0,0],[1, 0,0],[1, 0,0],[-1, 0,0],[-1, 0,0],
                    [0, -1, 0],[0, -1,0],[0, 1,0],[0, 1,0],[0, -1,0],[0, 1,0],[0, 1,0],[0, -1,0],
                    [0, 0, -1],[0, 0,-1],[0, 0,-1],[0, 0, -1],[0, 0,1],[0, 0,1],[0, 0,1],[0, 0,1]],
	*/
	myfile << "    \"normals\": [[-1, 0, 0],[1, 0,0],[1, 0,0],[-1, 0,0],[1, 0,0],[1, 0,0],[-1, 0,0],[-1, 0,0],\n";
    myfile << "                 [0, -1, 0],[0, -1,0],[0, 1,0],[0, 1,0],[0, -1,0],[0, 1,0],[0, 1,0],[0, -1,0],\n";
    myfile << "                 [0, 0, -1],[0, 0,-1],[0, 0,-1],[0, 0, -1],[0, 0,1],[0, 0,1],[0, 0,1],[0, 0,1]],\n";
	
	//"limitbaseX": [-1, 0],
	myfile << "    \"limitbaseX\": ["<<start_vert[0]<<", "<<end_vert[0]<<"],\n";
    myfile << "    \"limitbaseY\": ["<<start_vert[1]<<", "<<end_vert[1]<<"],\n";
    myfile << "    \"limitbaseZ\": ["<<start_vert[2]<<", "<<end_vert[2]<<"],\n";
    myfile << "    \"surfaceHeight\": "<<end_vert[1]<<",\n";
    //"surfaceLeftRightFront":[-1,0,0],
    myfile << "    \"surfaceLeftRightFront\": ["<<start_vert[0]<<","<<end_vert[0]<<","<<start_vert[2]<<"],\n";
    //"triangles": [[16,17,18],[16,18,19],[23,20,21],[23,21,22],[1,4,5],[1,5,2],[6,7,0],[6,0,3],[11,13,14],[11,10,13],[15,12,9],[8,15,9]]
    myfile << "    \"triangles\": [[16,17,18],[16,18,19],[23,20,21],[23,21,22],[1,4,5],[1,5,2],[6,7,0],[6,0,3],[11,13,14],[11,10,13],[15,12,9],[8,15,9]]\n";
    myfile << "  }";	
}